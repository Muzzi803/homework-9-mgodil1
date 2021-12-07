const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../../server");
const UserDao = require("../../server/data/UserDao");
const { createToken } = require("../../server/util/token");

const users = new UserDao();
const request = supertest(app);

describe("Test authentication endpoints", () => {
  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    await users.create({
      username: "test-client-auth",
      password: "test-client-auth",
      role: "CUSTOMER",
    });
  });

  describe("Test /authenticate", () => {
    test("Return 403 when username is incorrect", async () => {
      const response = await request.post("/authenticate").send({
        username: "client",
        password: "test-client-auth",
      });
      expect(response.status).toBe(403);
    });

    test("Return 403 when password is incorrect", async () => {
      const response = await request.post("/authenticate").send({
        username: "test-client-auth",
        password: "client",
      });
      expect(response.status).toBe(403);
    });

    test("Return 400 when payload is missing", async () => {
      const response = await request.post("/authenticate");
      expect(response.status).toBe(400);
    });

    test("Return 400 when username is missing", async () => {
      const response = await request.post("/authenticate").send({
        password: "test-client-auth",
      });
      expect(response.status).toBe(400);
    });

    test("Return 400 when password is missing", async () => {
      const response = await request.post("/authenticate").send({
        username: "test-client-auth",
      });
      expect(response.status).toBe(400);
    });

    test("Return 200 and JWT when authentication is successful", async () => {
      const response = await request.post("/authenticate").send({
        username: "test-client-auth",
        password: "test-client-auth",
      });
      expect(response.status).toBe(200);
      expect(response.body.token).toBeTruthy(); // exists and non empty!
    });
  });

  describe("Test /register", () => {
    test("Return 500 when username already exist", async () => {
      const response = await request.post("/register").send({
        username: "test-client-auth",
        password: "test-client-auth",
      });
      expect(response.status).toBe(500);
    });

    test("Return 400 when payload is missing", async () => {
      const response = await request.post("/register");
      expect(response.status).toBe(400);
    });

    test("Return 400 when username is missing", async () => {
      const response = await request.post("/register").send({
        password: "new-test-client-auth",
      });
      expect(response.status).toBe(400);
    });

    test("Return 400 when password is missing", async () => {
      const response = await request.post("/register").send({
        username: "new-test-client-auth",
      });
      expect(response.status).toBe(400);
    });

    test("Return 201 and JWT when registration is successful", async () => {
      const response = await request.post("/register").send({
        username: "new-test-client-auth",
        password: "new-test-client-auth",
      });
      expect(response.status).toBe(201);
      expect(response.body.token).toBeTruthy(); // exists and non empty!
    });
  });

  describe("Test /verify", () => {
    const token = {};

    beforeAll(async () => {
      token.valid = await createToken({
        username: "test-client-auth",
        role: "CUSTOMER",
      });

      token.invalid = token.valid
        .split("")
        .sort(function () {
          return 0.5 - Math.random();
        })
        .join("");

      token.expired = await createToken(
        {
          username: "test-client-auth",
          role: "CUSTOMER",
        },
        -1
      );
    });

    test("Return 403 when token is invalid", async () => {
      const response = await request.post("/verify").send({
        token: token.invalid,
      });
      expect(response.status).toBe(403);
    });

    test("Return 403 when token is expired", async () => {
      const response = await request.post("/verify").send({
        token: token.expired,
      });
      expect(response.status).toBe(403);
    });

    test("Return 400 when payload is missing", async () => {
      const response = await request.post("/verify");
      expect(response.status).toBe(400);
    });

    test("Return 400 when payload does not contain a token", async () => {
      const response = await request.post("/verify").send({
        jwt: token.valid,
      });
      expect(response.status).toBe(400);
    });

    test("Return 200 and JWT when verification is successful", async () => {
      const response = await request.post("/verify").send({
        token: token.valid,
      });
      expect(response.status).toBe(200);
      expect(response.body.token).toBe(token.valid);
    });
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });
});
