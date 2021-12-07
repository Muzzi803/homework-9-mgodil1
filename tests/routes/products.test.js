const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../../server");
const ProductDao = require("../../server/data/ProductDao");
const { createToken } = require("../../server/util/token");

const products = new ProductDao();
const request = supertest(app);

const endpoint = "/api/products";

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
      samples[0] = await products.create({
        name: "Eloquent JavaScript",
        price: 20.99,
      });

      samples[1] = await products.create({
        name: "JavaScript: The Good Parts",
        price: 13.69,
      });
    });

    test("Return 200 and list of products for successful request", async () => {
      const response = await request.get(endpoint);
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(samples.length);
    });

    describe(`Test GET ${endpoint} with query parameter`, () => {
      test("Return 400 for non-numeric price range", async () => {
        const minPrice = "fifteen";
        const maxPrice = "eighteen";
        const response = await request.get(
          `${endpoint}?minPrice=${minPrice}&maxPrice=${maxPrice}`
        );
        expect(response.status).toBe(400);
      });

      test("Return 200 and list of products matching a given query name", async () => {
        const query = "The";
        const response = await request.get(`${endpoint}?query=${query}`);
        const expected = samples.filter((s) => s.name.includes(query)).length;
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(expected);
      });

      test("Return 200 and empty list for query name with no match", async () => {
        const query = "non-existing-phrase";
        const response = await request.get(`${endpoint}?query=${query}`);
        const expected = samples.filter((s) => s.name.includes(query)).length;
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(expected);
      });

      test("Return 200 and list of products matching a given price range", async () => {
        const minPrice = 15;
        const response = await request.get(`${endpoint}?minPrice=${minPrice}`);
        const expected = samples.filter((s) => s.price >= minPrice).length;
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(expected);
      });

      test("Return 200 and empty list of a given price range with no match", async () => {
        const minPrice = 15;
        const maxPrice = 18;
        const response = await request.get(
          `${endpoint}?minPrice=${minPrice}&maxPrice=${maxPrice}`
        );
        const expected = samples.filter(
          (s) => s.price >= minPrice && s.price <= maxPrice
        ).length;
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(expected);
      });
    });

    afterAll(async () => {
      for (const sample of samples) {
        await products.delete(sample._id);
      }
    });
  });

  describe(`Test GET ${endpoint}/:id`, () => {
    let product;

    beforeAll(async () => {
      product = await products.create({
        name: "JavaScript: The Definitive Guide",
        price: 50.69,
      });
    });

    test("Return 404 for an invalid id", async () => {
      const id = mongoose.Types.ObjectId().toString();
      const response = await request.get(`${endpoint}/${id}`);
      expect(response.status).toBe(404);
    });

    test("Return 200 and the product for a given id", async () => {
      const id = product._id;
      const response = await request.get(`${endpoint}/${id}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toStrictEqual(product);
    });

    afterAll(async () => {
      await products.delete(product._id);
    });
  });

  describe(`Test POST ${endpoint}`, () => {
    const product = {
      name: "Designing Web APIs: Building APIs That Developers Love",
      price: 21.99,
    };

    test("Return 403 for missing token", async () => {
      const response = await request.post(endpoint).send(product);
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      const response = await request
        .post(endpoint)
        .send(product)
        .set("Authorization", `Bearer ${tokens.invalid}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for unauthorized token", async () => {
      const response = await request
        .post(endpoint)
        .send(product)
        .set("Authorization", `Bearer ${tokens.customer}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for expired token", async () => {
      const response = await request
        .post(endpoint)
        .send(product)
        .set("Authorization", `Bearer ${tokens.expiredAdmin}`);
      expect(response.status).toBe(403);
    });

    test("Return 400 for missing name", async () => {
      const response = await request
        .post(endpoint)
        .send({
          price: product.price,
        })
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(400);
    });

    test("Return 400 for missing price", async () => {
      const response = await request
        .post(endpoint)
        .send({
          name: product.name,
        })
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(400);
    });

    test("Return 201 and the product for successful request", async () => {
      const response = await request
        .post(endpoint)
        .send(product)
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe(product.name);
      expect(response.body.data.price).toBe(product.price);
      product._id = response.body.data._id;
    });

    afterAll(async () => {
      await products.delete(product._id);
    });
  });

  describe(`Test PUT ${endpoint}/:id`, () => {
    let product;

    beforeAll(async () => {
      product = await products.create({
        name: "Secrets of the JavaScript Ninja",
        price: 42.74,
      });
    });

    test("Return 404 for invalid ID", async () => {
      const response = await request
        .put(`${endpoint}/${mongoose.Types.ObjectId().toString()}`)
        .send({
          name: `${product.name} 2nd Edition`,
        })
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(404);
    });

    test("Return 403 for missing token", async () => {
      const response = await request.put(`${endpoint}/${product._id}`).send({
        name: `${product.name} 2nd Edition`,
      });
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      const response = await request
        .put(`${endpoint}/${product._id}`)
        .send({
          name: `${product.name} 2nd Edition`,
        })
        .set("Authorization", `Bearer ${tokens.invalid}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for unauthorized token", async () => {
      const response = await request
        .put(`${endpoint}/${product._id}`)
        .send({
          name: `${product.name} 2nd Edition`,
        })
        .set("Authorization", `Bearer ${tokens.customer}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for expired token", async () => {
      const response = await request
        .put(`${endpoint}/${product._id}`)
        .send({
          name: `${product.name} 2nd Edition`,
        })
        .set("Authorization", `Bearer ${tokens.expiredAdmin}`);
      expect(response.status).toBe(403);
    });

    test("Return 400 for missing payload", async () => {
      const response = await request
        .put(`${endpoint}/${product._id}`)
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(400);
    });

    test("Return 200 and updated product for successful request", async () => {
      const response = await request
        .put(`${endpoint}/${product._id}`)
        .send({
          name: `${product.name} 2nd Edition`,
        })
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(`${product.name} 2nd Edition`);
    });

    afterAll(async () => {
      await products.delete(product._id);
    });
  });

  describe(`Test DELETE ${endpoint}/:id`, () => {
    let product;

    beforeAll(async () => {
      product = await products.create({
        name: "Testing JavaScript Applications",
        price: 47.99,
      });
    });

    test("Return 404 for invalid ID", async () => {
      const response = await request
        .delete(`${endpoint}/${mongoose.Types.ObjectId().toString()}`)
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(404);
    });

    test("Return 403 for missing token", async () => {
      const response = await request.delete(`${endpoint}/${product._id}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      const response = await request
        .delete(`${endpoint}/${product._id}`)
        .set("Authorization", `Bearer ${tokens.invalid}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for unauthorized token", async () => {
      const response = await request
        .delete(`${endpoint}/${product._id}`)
        .set("Authorization", `Bearer ${tokens.customer}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for expired token", async () => {
      const response = await request
        .delete(`${endpoint}/${product._id}`)
        .set("Authorization", `Bearer ${tokens.expiredAdmin}`);
      expect(response.status).toBe(403);
    });

    test("Return 200 & deleted product for successful request", async () => {
      const response = await request
        .delete(`${endpoint}/${product._id}`)
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toStrictEqual(product);
    });
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });
});
