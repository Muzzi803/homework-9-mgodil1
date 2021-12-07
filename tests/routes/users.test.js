const faker = require("faker");
const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../../server");
const UserDao = require("../../server/data/UserDao");
const { createToken } = require("../../server/util/token");

const users = new UserDao();
const request = supertest(app);

const endpoint = "/api/users";

describe(`Test ${endpoint} endpoints`, () => {
  const tokens = {};

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);

    tokens.admin = await createToken({ role: "ADMIN" });
    tokens.invalid = tokens.admin
      .split("")
      .sort(function () {
        return 0.5 - Math.random();
      })
      .join("");
    tokens.customer = await createToken({ role: "CUSTOMER" });
    tokens.expiredAdmin = await createToken({ role: "ADMIN" }, -1);
  });

  describe(`Test GET ${endpoint}`, () => {
    const samples = [];

    beforeAll(async () => {
      samples[0] = await users.create({
        username: faker.internet.userName(),
        password: faker.internet.password(),
        role: "CUSTOMER",
      });

      samples[1] = await users.create({
        username: faker.internet.userName(),
        password: faker.internet.password(),
        role: "CUSTOMER",
      });

      samples[2] = await users.create({
        username: faker.internet.userName(),
        password: faker.internet.password(),
        role: "ADMIN",
      });
    });

    test("Return 403 for missing token", async () => {
      const response = await request.get(endpoint);
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      const response = await request
        .get(endpoint)
        .set("Authorization", `Bearer ${tokens.invalid}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for unauthorized token", async () => {
      const response = await request
        .get(endpoint)
        .set("Authorization", `Bearer ${tokens.customer}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for expired token", async () => {
      const response = await request
        .get(endpoint)
        .set("Authorization", `Bearer ${tokens.expiredAdmin}`);
      expect(response.status).toBe(403);
    });

    test("Return 200 and list of users for successful request", async () => {
      const response = await request
        .get(endpoint)
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(samples.length);
    });

    describe(`Test GET ${endpoint} with query parameter`, () => {
      test("Return 400 when both username and role query parameters are provided", async () => {
        const username = samples[1].username;
        const role = samples[1].role;
        const response = await request
          .get(`${endpoint}?username=${username}&role=${role}`)
          .set("Authorization", `Bearer ${tokens.admin}`);
        expect(response.status).toBe(400);
      });

      test("Return 200 and list of users for a given role", async () => {
        const role = "ADMIN";
        const response = await request
          .get(`${endpoint}?role=${role}`)
          .set("Authorization", `Bearer ${tokens.admin}`);
        const expected = samples.filter((s) => s.role === role).length;
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(expected);
      });

      test("Return 200 and empty list for non-existing role", async () => {
        const role = "non-existing-role";
        const response = await request
          .get(`${endpoint}?role=${role}`)
          .set("Authorization", `Bearer ${tokens.admin}`);
        const expected = samples.filter((s) => s.role === role).length;
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(expected);
      });

      test("Return 200 and a user for a given username", async () => {
        const username = samples[1].username;
        const response = await request
          .get(`${endpoint}?username=${username}`)
          .set("Authorization", `Bearer ${tokens.admin}`);
        const expected = samples.filter((s) => s.username === username);
        expect(response.status).toBe(200);
        expect(response.body.data).toStrictEqual(expected);
      });

      test("Return 200 and empty list fon non-existing username", async () => {
        const username = "non-existing-username";
        const response = await request
          .get(`${endpoint}?username=${username}`)
          .set("Authorization", `Bearer ${tokens.admin}`);
        const expected = samples.filter((s) => s.username === username);
        expect(response.status).toBe(200);
        expect(response.body.data).toStrictEqual(expected);
      });
    });

    afterAll(async () => {
      for (const sample of samples) {
        await users.delete(sample._id);
      }
    });
  });

  describe(`Test GET ${endpoint}/:id`, () => {
    let user;
    let userToken;

    beforeAll(async () => {
      user = await users.create({
        username: faker.internet.userName(),
        password: faker.internet.password(),
        role: "CUSTOMER",
      });

      userToken = await createToken(user);
    });

    test("Return 404 for an invalid id", async () => {
      const id = mongoose.Types.ObjectId().toString();
      const response = await request
        .get(`${endpoint}/${id}`)
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(404);
    });

    test("Return 403 for missing token", async () => {
      const id = user._id;
      const response = await request.get(`${endpoint}/${id}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      const id = user._id;
      const response = await request
        .get(`${endpoint}/${id}`)
        .set("Authorization", `Bearer ${tokens.invalid}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for unauthorized token", async () => {
      const id = user._id;
      const response = await request
        .get(`${endpoint}/${id}`)
        .set("Authorization", `Bearer ${tokens.customer}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for expired token", async () => {
      const id = user._id;
      const response = await request
        .get(`${endpoint}/${id}`)
        .set("Authorization", `Bearer ${tokens.expiredAdmin}`);
      expect(response.status).toBe(403);
    });

    describe("Return 200 and the user for a given id", () => {
      test("Customer can get their own user info", async () => {
        const id = user._id;
        const response = await request
          .get(`${endpoint}/${id}`)
          .set("Authorization", `Bearer ${userToken}`);
        expect(response.status).toBe(200);
        expect(response.body.data).toStrictEqual(user);
      });

      test("Admin can get user info for any user", async () => {
        const id = user._id;
        const response = await request
          .get(`${endpoint}/${id}`)
          .set("Authorization", `Bearer ${tokens.admin}`);
        expect(response.status).toBe(200);
        expect(response.body.data).toStrictEqual(user);
      });
    });

    afterAll(async () => {
      await users.delete(user._id);
    });
  });

  describe(`Test POST ${endpoint}`, () => {
    let user;
    let existingUser;

    beforeAll(async () => {
      existingUser = await users.create({
        username: "existing-user-post",
        password: "existing-user-post",
        role: "ADMIN",
      });

      user = {
        username: "test-user-post",
        password: "test-user-post",
        role: "CUSTOMER",
      };
    });

    test("Return 500 when username is already in-use", async () => {
      const response = await request
        .post(endpoint)
        .send({
          username: "existing-user-post",
          password: "existing-user-post",
          role: "ADMIN",
        })
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(500);
    });

    test("Return 403 for missing token", async () => {
      const response = await request.post(endpoint).send(user);
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      const response = await request
        .post(endpoint)
        .send(user)
        .set("Authorization", `Bearer ${tokens.invalid}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for unauthorized token", async () => {
      const response = await request
        .post(endpoint)
        .send(user)
        .set("Authorization", `Bearer ${tokens.customer}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for expired token", async () => {
      const response = await request
        .post(endpoint)
        .send(user)
        .set("Authorization", `Bearer ${tokens.expiredAdmin}`);
      expect(response.status).toBe(403);
    });

    test("Return 400 for missing payload", async () => {
      const response = await request
        .post(endpoint)
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(400);
    });

    test("Return 400 for missing username", async () => {
      const response = await request
        .post(endpoint)
        .send({
          password: "test-user-post",
          role: "CUSTOMER",
        })
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(400);
    });

    test("Return 400 for missing password", async () => {
      const response = await request
        .post(endpoint)
        .send({
          username: "test-user-post",
          role: "CUSTOMER",
        })
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(400);
    });

    test("Return 400 for missing role", async () => {
      const response = await request
        .post(endpoint)
        .send({
          username: "test-user-post",
          password: "test-user-post",
        })
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(400);
    });

    test("Return 400 for invalid role", async () => {
      const response = await request
        .post(endpoint)
        .send({
          username: "test-user-post",
          password: "test-user-post",
          role: "SOME_UNSUPPORTED_ROLE",
        })
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(400);
    });

    test("Return 201 and the user for successful request", async () => {
      const response = await request
        .post(endpoint)
        .send(user)
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(201);
      expect(response.body.data.username).toBe(user.username);
      expect(response.body.data.role).toBe(user.role);
      user._id = response.body.data._id;
    });

    afterAll(async () => {
      await users.delete(existingUser._id);
      await users.delete(user._id);
    });
  });

  describe(`Test PUT ${endpoint}/:id`, () => {
    let user;
    let userToken;

    beforeAll(async () => {
      user = await users.create({
        username: "test-user-put",
        password: "test-user-put",
        role: "CUSTOMER",
      });

      userToken = await createToken(user);
    });

    test("Return 404 for invalid ID", async () => {
      const response = await request
        .put(`${endpoint}/${mongoose.Types.ObjectId().toString()}`)
        .send({
          role: "ADMIN",
        })
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(404);
    });

    test("Return 403 for missing token", async () => {
      const response = await request.put(`${endpoint}/${user._id}`).send({
        role: "ADMIN",
      });
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      const response = await request
        .put(`${endpoint}/${user._id}`)
        .send({
          role: "ADMIN",
        })
        .set("Authorization", `Bearer ${tokens.invalid}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for unauthorized token", async () => {
      const response = await request
        .put(`${endpoint}/${user._id}`)
        .send({
          role: "ADMIN",
        })
        .set("Authorization", `Bearer ${tokens.customer}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for customer updating their role", async () => {
      const response = await request
        .put(`${endpoint}/${user._id}`)
        .send({
          role: "ADMIN",
        })
        .set("Authorization", `Bearer ${userToken}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for expired token", async () => {
      const response = await request
        .put(`${endpoint}/${user._id}`)
        .send({
          role: "ADMIN",
        })
        .set("Authorization", `Bearer ${tokens.expiredAdmin}`);
      expect(response.status).toBe(403);
    });

    test("Return 400 for missing payload", async () => {
      const response = await request
        .put(`${endpoint}/${user._id}`)
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(400);
    });

    describe("Return 200 and updated user for successful request", () => {
      test("Customer can update their account", async () => {
        const response = await request
          .put(`${endpoint}/${user._id}`)
          .send({
            password: "updated-password",
          })
          .set("Authorization", `Bearer ${userToken}`);
        expect(response.status).toBe(200);
      });

      test("Admin can update any user account", async () => {
        const response = await request
          .put(`${endpoint}/${user._id}`)
          .send({
            role: "ADMIN",
          })
          .set("Authorization", `Bearer ${tokens.admin}`);
        expect(response.status).toBe(200);
        expect(response.body.data.role).toBe("ADMIN");
      });
    });

    afterAll(async () => {
      await users.delete(user._id);
    });
  });

  describe(`Test DELETE ${endpoint}/:id`, () => {
    const samples = [];

    beforeAll(async () => {
      samples[0] = await users.create({
        username: faker.internet.userName(),
        password: faker.internet.password(),
        role: "CUSTOMER",
      });

      samples[1] = await users.create({
        username: faker.internet.userName(),
        password: faker.internet.password(),
        role: "CUSTOMER",
      });
    });

    test("Return 404 for invalid ID", async () => {
      const response = await request
        .delete(`${endpoint}/${mongoose.Types.ObjectId().toString()}`)
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(404);
    });

    test("Return 403 for missing token", async () => {
      const response = await request.delete(`${endpoint}/${samples[0]._id}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      const response = await request
        .delete(`${endpoint}/${samples[0]._id}`)
        .set("Authorization", `Bearer ${tokens.invalid}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for unauthorized token", async () => {
      const response = await request
        .delete(`${endpoint}/${samples[0]._id}`)
        .set("Authorization", `Bearer ${tokens.customer}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for expired token", async () => {
      const response = await request
        .delete(`${endpoint}/${samples[0]._id}`)
        .set("Authorization", `Bearer ${tokens.expiredAdmin}`);
      expect(response.status).toBe(403);
    });

    describe("Return 200 and deleted user for successful request", () => {
      test("Customer can delete their account", async () => {
        const token = await createToken(samples[0]);
        const response = await request
          .delete(`${endpoint}/${samples[0]._id}`)
          .set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body.data).toStrictEqual(samples[0]);
      });

      test("Admin can delete any user account", async () => {
        const response = await request
          .delete(`${endpoint}/${samples[1]._id}`)
          .set("Authorization", `Bearer ${tokens.admin}`);
        expect(response.status).toBe(200);
        expect(response.body.data).toStrictEqual(samples[1]);
      });
    });
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });
});
