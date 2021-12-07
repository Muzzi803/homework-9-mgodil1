const faker = require("faker");

const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../../server");
const { createToken } = require("../../server/util/token");

const UserDao = require("../../server/data/UserDao");
const OrderDao = require("../../server/data/OrderDao");
const ProductDao = require("../../server/data/ProductDao");

const users = new UserDao();
const order = new OrderDao();
const products = new ProductDao();

const request = supertest(app);

const endpoint = "/api/orders";

function create_product_object(product, quantity) {
  return {
    product: product._id,
    quantity: quantity,
  };
}

describe(`Test ${endpoint} endpoints`, () => {
  // You may want to declare variables here
  const tokens = {};
  const sample_users = [];
  const sample_products = [];
  const sample_orders = [];

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);

    // You may want to do more in here, e.g. initialize
    // the variables used by all the tests!

    //we have 2 users and an admin that "signed up"

    sample_users[0] = await users.create({
      username: faker.internet.userName(),
      password: faker.internet.password(),
      role: "ADMIN",
    });

    sample_users[1] = await users.create({
      username: faker.internet.userName(),
      password: faker.internet.password(),
      role: "CUSTOMER",
    });

    sample_users[2] = await users.create({
      username: faker.internet.userName(),
      password: faker.internet.password(),
      role: "CUSTOMER",
    });
    sample_users[3] = await users.create({
      username: faker.internet.userName(),
      password: faker.internet.password(),
      role: "CUSTOMER",
    });
    tokens.admin = await createToken(sample_users[0]);
    tokens.customer1 = await createToken(sample_users[1]);
    tokens.customer2 = await createToken(sample_users[2]);
    tokens.customer3 = await createToken(sample_users[3]);
    tokens.missingcustomer = await createToken({});
    tokens.nonexistentcustomer = await createToken({
      _id: new mongoose.Types.ObjectId(),
      username: "Missing Customer",
      role: "CUSTOMER",
    });
    tokens.invalid = tokens.admin
      .split("")
      .sort(function () {
        return 0.5 - Math.random();
      })
      .join("");
    tokens.expiredAdmin = await createToken({ role: "ADMIN" }, -1);

    //We have 4 books in our product list!
    sample_products[0] = await products.create({
      name: "Prod0",
      price: 5.0,
    });
    sample_products[1] = await products.create({
      name: "Prod1",
      price: 15.0,
    });
    sample_products[2] = await products.create({
      name: "Prod2",
      price: 1.0,
    });
    sample_products[3] = await products.create({
      name: "Prod3",
      price: 20.9,
    });

    sample_orders[0] = await order.create({
      customer: sample_users[1]._id,
      products: [
        create_product_object(sample_products[0], 2),
        create_product_object(sample_products[1], 1),
        create_product_object(sample_products[2], 1),
      ],
    });

    sample_orders[1] = await order.create({
      customer: sample_users[1]._id,
      products: [create_product_object(sample_products[3], 1)],
    });

    sample_orders[2] = await order.create({
      customer: sample_users[2]._id,
      products: [create_product_object(sample_products[0], 1)],
    });

    sample_orders[3] = await order.create({
      customer: sample_users[2]._id,
      products: [create_product_object(sample_products[1], 1)],
    });

    //update sample_orders[1] to have COMPLETE
    sample_orders[1] = await order.update(
      sample_orders[1]._id,
      sample_users[1]._id,
      {
        status: "COMPLETE",
      }
    );
    // console.log(tokens, sample_users, sample_products, sample_orders);
  });

  describe(`Test GET ${endpoint}`, () => {
    test("Return 403 for missing token", async () => {
      const response = await request.get(endpoint);
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      const response = await request
        .get(endpoint)
        .set("authorization", `Bearer ${tokens.invalid}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for unauthorized token", async () => {
      // An admin can see any order, however a customer should not be allowed to
      //  see other customers' orders
      // no query parameter after endpoint, hence customer is "trying" to see all customer orders
      const response = await request
        .get(endpoint)
        .set("authorization", `Bearer ${tokens.customer}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for expired token", async () => {
      const response = await request
        .get(endpoint)
        .set("authorization", `Bearer ${tokens.expiredAdmin}`);
      expect(response.status).toBe(403);
    });

    describe("Return 200 and list of orders for successful request", () => {
      test("Admin can see any order", async () => {
        const response = await request
          .get(endpoint)
          .set("authorization", `Bearer ${tokens.admin}`);
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(sample_orders.length);
      });
    });

    describe(`Test GET ${endpoint} with query parameter`, () => {
      describe("Admin can see any order", () => {
        test("Return 200 and the order for a given customer", async () => {
          const cust_id = sample_users[1]._id;
          const response = await request
            .get(`${endpoint}?customer=${cust_id}`)
            .set("authorization", `Bearer ${tokens.admin}`);
          expect(response.status).toBe(200);
          //first customer made 2 separate orders in "BeforeAll"
          expect(response.body.data.length).toBe(2);
        });

        test("Return 200 and the orders with status of ACTIVE", async () => {
          // sample_users[1] has one active order and one complete order
          const cust_id = sample_users[1]._id;
          const status = "ACTIVE";
          const response = await request
            .get(`${endpoint}?customer=${cust_id}&status=${status}`)
            .set("authorization", `Bearer ${tokens.admin}`);
          expect(response.status).toBe(200);
          expect(response.body.data.length).toBe(1);
        });

        test("Return 200 and the orders with status of COMPLETE", async () => {
          // sample_users[1] has one active order and one complete order
          const cust_id = sample_users[1]._id;
          const status = "COMPLETE";
          const response = await request
            .get(`${endpoint}?customer=${cust_id}&status=${status}`)
            .set("authorization", `Bearer ${tokens.admin}`);
          expect(response.status).toBe(200);
          expect(response.body.data.length).toBe(1);
        });
      });

      describe("Customer can see their order(s)", () => {
        test("Return 200 and the order for a given customer", async () => {
          const cust_id = sample_users[1]._id;
          const response = await request
            .get(`${endpoint}?customer=${cust_id}`)
            .set("authorization", `Bearer ${tokens.customer1}`);
          expect(response.status).toBe(200);
          //first customer made 2 separate orders in "BeforeAll"
          expect(response.body.data.length).toBe(2);
        });

        test("Return 200 and this customer's orders with status of ACTIVE", async () => {
          // first customer has 1 active order and 1 complete order
          const cust_id = sample_users[1]._id;
          const status = "ACTIVE";
          const response = await request
            .get(`${endpoint}?customer=${cust_id}&status=${status}`)
            .set("authorization", `Bearer ${tokens.customer1}`);
          expect(response.status).toBe(200);
          expect(response.body.data.length).toBe(1);
        });

        test("Return 200 and this customer's orders with status of COMPLETE", async () => {
          //first customer has 1 active order and 1 complete order
          const cust_id = sample_users[1]._id;
          const status = "COMPLETE";
          const response = await request
            .get(`${endpoint}?customer=${cust_id}&status=${status}`)
            .set("authorization", `Bearer ${tokens.customer1}`);
          expect(response.status).toBe(200);
          expect(response.body.data.length).toBe(1);
        });
      });

      test("Return 200 and an empty list for orders with invalid customer query", async () => {
        //customer3 didn't actually order anything, we just use customer3's id to simulate an "invalid" query
        const cust_id = sample_users[3]._id;
        const response = await request
          .get(`${endpoint}?customer=${cust_id}`)
          .set("authorization", `Bearer ${tokens.customer3}`);
        expect(response.status).toBe(200);
        // console.log(response.body.data);
        expect(response.body.data.length).toBe(0);
      });

      test("Return 200 and an empty list for orders with invalid status query", async () => {
        const cust_id = sample_users[1]._id;
        const status = "YouMustBeNutzz!";
        const response = await request
          .get(`${endpoint}?customer=${cust_id}&status=${status}`)
          .set("authorization", `Bearer ${tokens.customer1}`);
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(0);
      });
    });

    // afterAll(async () => {
    //   for (const sample of sample_orders) {
    //     await order.delete(sample._id, sample.customer);
    //   }
    // });
  });

  describe(`Test GET ${endpoint}/:id`, () => {
    test("Return 404 for invalid order ID", async () => {
      const orderID = "You Must be Nutz!";
      const response = await request
        .get(`${endpoint}/${orderID}`)
        .set("authorization", `Bearer ${tokens.admin}`);
      expect(response.status).toBe(404);
    });

    test("Return 403 for missing token", async () => {
      const orderID = sample_orders[0]._id;
      const response = await request.get(`${endpoint}/${orderID}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      // TODO Implement me!

      const orderID = sample_orders[0]._id;
      const response = await request
        .get(`${endpoint}/${orderID}`)
        .set("authorization", `Bearer ${tokens.invalid}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for unauthorized token", async () => {
      // An admin can see any order, however a customer should not be allowed to
      //  see other customers' orders
      // customer 1 ordered sample_orders[0] therefore customer 2 shouldn't have access
      const orderID = sample_orders[0]._id;
      const response = await request
        .get(`${endpoint}/${orderID}`)
        .set("authorization", `Bearer ${tokens.customer2}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for expired token", async () => {
      // TODO Implement me!
      const orderID = sample_orders[0]._id;
      const response = await request
        .get(`${endpoint}/${orderID}`)
        .set("authorization", `Bearer ${tokens.expiredAdmin}`);
      expect(response.status).toBe(403);
    });

    describe("Return 200 and the order for successful request", () => {
      test("Admin can see any order", async () => {
        // TODO Implement me!
        const orderID = sample_orders[1]._id;
        const response = await request
          .get(`${endpoint}/${orderID}`)
          .set("authorization", `Bearer ${tokens.admin}`);
        expect(response.status).toBe(200);
        // console.log(response.body.data);
        expect(response.body.data.length).toBe(1);
      });

      test("Customer can see their order only", async () => {
        // TODO Implement me!
        //customer1 did in fact order sample_orders[1]!
        const orderID = sample_orders[1]._id;
        const response = await request
          .get(`${endpoint}/${orderID}`)
          .set("authorization", `Bearer ${tokens.customer1}`);
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(1);
      });
    });
  });

  describe(`Test POST ${endpoint}`, () => {
    test("Return 403 for missing token", async () => {
      const response = await request.post(endpoint);
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      const response = await request
        .post(endpoint)
        .set("authorization", `Bearer ${tokens.invalid}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for expired token", async () => {
      const response = await request
        .post(endpoint)
        .set("authorization", `Bearer ${tokens.expiredAdmin}`);
      expect(response.status).toBe(403);
    });

    test("Return 400 for missing customer", async () => {
      // TODO Implement me!
      const response = await request
        .post(endpoint)
        .set("authorization", `Bearer ${tokens.missingcustomer}`);
      expect(response.status).toBe(400);
    });

    test("Return 404 for non-existing customer", async () => {
      // A token with a user ID that resembles a valid mongoose ID
      //  however, there is no user in the database with that ID!
      // TODO Implement me!
      const response = await request
        .post(endpoint)
        .set("authorization", `Bearer ${tokens.nonexistentcustomer}`);
      expect(response.status).toBe(404);
    });

    test("Return 400 for missing payload", async () => {
      // TODO Implement me!
      const response = await request
        .post(endpoint)
        .set("authorization", `Bearer ${tokens.customer1}`);
      expect(response.status).toBe(400);
    });

    test("Return 400 for invalid quantity attribute", async () => {
      // Quantity attribute for each product must be a positive value.
      // TODO Implement me!

      const response = await request
        .post(endpoint)
        .send({
          products: [
            {
              product: sample_products[0]._id,
              quantity: -1,
            },
          ],
        })
        .set("authorization", `Bearer ${tokens.customer1}`);
      expect(response.status).toBe(400);
    });

    test("Return 404 for non-existing product attribute", async () => {
      // A product ID that resembles a valid mongoose ID
      //  however, there is no product in the database with that ID!
      // TODO Implement me!

      const response = await request
        .post(endpoint)
        .send({
          products: [
            {
              product: new mongoose.Types.ObjectId(),
              quantity: 1,
            },
          ],
        })
        .set("authorization", `Bearer ${tokens.customer1}`);
      expect(response.status).toBe(404);
    });

    test("Return 400 for invalid product attribute", async () => {
      // A product ID that is not even a valid mongoose ID!
      // TODO Implement me!
      const response = await request
        .post(endpoint)
        .send({
          products: [
            {
              product: "I'm not a valid mongoose id obvs",
              quantity: 1,
            },
          ],
        })
        .set("authorization", `Bearer ${tokens.customer1}`);
      expect(response.status).toBe(404);
    });

    test("Return 201 and the order for successful request", async () => {
      // The "customer" who places the order must be identified through
      //  the authorization token.
      // Moreover, when an order is placed, its status is ACTIVE.
      // The client only provides the list of products.
      // The API shall calculate the total price!
      // TODO Implement me!
      const response = await request
        .post(endpoint)
        .send({
          products: [
            {
              product: sample_products[0]._id,
              quantity: 1,
            },
          ],
        })
        .set("authorization", `Bearer ${tokens.customer1}`);
      expect(response.status).toBe(201);
      expect(response.body.data[0].status).toBe("ACTIVE");
      expect(response.body.data[0].total).toBe(sample_products[0].price);
    });
  });

  // describe(`Test PUT ${endpoint}/:id`, () => {
  //     test("Return 404 for invalid order ID", async () => {
  //       // TODO Implement me!
  //       const invalid_id = new mongoose.Types.ObjectId();
  //       const response = await request
  //         .put(`${endpoint}/${invalid_id}`)
  //         .set("authorization", `Bearer ${tokens.customer1}`);
  //       expect(response.status).toBe(404);
  //     });

  //     test("Return 403 for missing token", async () => {
  //       // TODO Implement me!
  //       const response = await request
  //         .put(`${endpoint}/${sample_orders[0]._id}`)
  //       expect(response.status).toBe(403);
  //     });

  //     test("Return 403 for invalid token", async () => {
  //       // TODO Implement me!
  //       const response = await request
  //         .put(`${endpoint}/${invalid_id}`)
  //         .set("authorization", `Bearer ${tokens.invalid}`);
  //       expect(response.status).toBe(403);
  //     });

  //     describe("Return 403 for unauthorized token", () => {
  //       test("Admins not allowed to update others' orders", async () => {
  //         // TODO Implement me!
  //         //sample_user[1] ordered sample_rders[1], therefore admin shouldn't be allowed this update
  //         const response = await request
  //         .put(`${endpoint}/${sample_orders[1]._id}`)
  //         .set("authorization", `Bearer ${tokens.admin}`);
  //       expect(response.status).toBe(403);
  //       });

  //       test("Customers not allowed to update others' orders", async () => {
  //         // TODO Implement me!
  //         //sample_user[1] ordered sample_orders[1], therefore customer2 should be denied
  //         const response = await request
  //         .put(`${endpoint}/${sample_orders[1]._id}`)
  //         .set("authorization", `Bearer ${tokens.customer2}`);
  //       expect(response.status).toBe(403);
  //       });
  //     });

  //     test("Return 403 for expired token", async () => {
  //       // TODO Implement me!
  //       const response = await request
  //         .put(`${endpoint}/${sample_orders[1]._id}`)
  //         .set("authorization", `Bearer ${tokens.expiredAdmin}`);
  //       expect(response.status).toBe(403);
  //     });

  //     test("Return 400 for missing payload", async () => {
  //       // TODO Implement me!
  //       const response = await request
  //         .put(`${endpoint}/${sample_orders[1]._id}`)
  //         .set("authorization", `Bearer ${tokens.customer1}`);
  //       expect(response.status).toBe(400);
  //     });

  //     test("Return 400 for invalid status attribute", async () => {
  //       // TODO Implement me!

  //       const response = await request
  //         .put(`${endpoint}/${sample_orders[1]._id}`)
  //         .set("authorization", `Bearer ${tokens.customer1}`).send(
  //           {
  //             products: [
  //               create_product_object(sample_products[0], 3)
  //             ],
  //             status: "DEFINITELY NOT A VALID STATUS"
  //           }

  //         );
  //       expect(response.status).toBe(400);
  //     });

  //     test("Return 400 for invalid quantity attribute", async () => {
  //       // TODO Implement me!
  //       const response = await request
  //         .put(`${endpoint}/${sample_orders[1]._id}`)
  //         .set("authorization", `Bearer ${tokens.customer1}`).send(
  //           {
  //             products: [
  //               create_product_object(sample_products[0], -1),
  //             ],
  //             status: "ACTIVE"
  //           }

  //         );
  //       expect(response.status).toBe(400);
  //     });

  //     describe("Return 200 and the updated order for successful request", () => {
  //       test("Update products, e.g., add/remove or change quantity", async () => {
  //         // TODO Implement me!
  //         const response = await request
  //         .put(`${endpoint}/${sample_orders[1]._id}`)
  //         .set("authorization", `Bearer ${tokens.customer1}`).send(
  //           {
  //             products: [
  //               create_product_object(sample_products[0], 3),
  //             ],
  //           }
  //         );
  //       expect(response.status).toBe(200);
  //       });

  //       test("Update status, e.g., from ACTIVE to COMPLETE", async () => {
  //         // TODO Implement me!
  //         const response = await request
  //         .put(`${endpoint}/${sample_orders[1]._id}`)
  //         .set("authorization", `Bearer ${tokens.customer1}`).send(
  //           {
  //             status: "COMPLETE"
  //           }
  //         );
  //       expect(response.status).toBe(200);
  //       });
  //     });
  //   });

  describe(`Test DELETE ${endpoint}/:id`, () => {
    test("Return 404 for invalid order ID", async () => {
      const invalid_id = new mongoose.Types.ObjectId();
      const response = await request
        .delete(`${endpoint}/${invalid_id}`)
        .set("authorization", `Bearer ${tokens.customer1}`);
      expect(response.status).toBe(404);
    });

    test("Return 403 for missing token", async () => {
      const response = await request.delete(
        `${endpoint}/${sample_orders[0]._id}`
      );
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      const response = await request
        .delete(`${endpoint}/${sample_orders[0]._id}`)
        .set("authorization", `Bearer ${tokens.invalidAdmin}`);
      expect(response.status).toBe(403);
    });

    describe("Return 403 for unauthorized token", () => {
      test("Admins not allowed to delete others' orders", async () => {
        //sample_user[1] ordered sample_rders[1], therefore admin shouldn't be allowed this update
        const response = await request
          .delete(`${endpoint}/${sample_orders[1]._id}`)
          .set("authorization", `Bearer ${tokens.admin}`);
        expect(response.status).toBe(403);
      });

      test("Customers not allowed to delete others' orders", async () => {
        // TODO Implement me!
        //sample_user[1] ordered sample_orders[1], therefore customer2 should be denied
        const response = await request
          .delete(`${endpoint}/${sample_orders[1]._id}`)
          .set("authorization", `Bearer ${tokens.customer2}`);
        console.log("data:", response.body.data);
        expect(response.status).toBe(403);
      });
    });

    test("Return 403 for expired token", async () => {
      // TODO Implement me!
      const response = await request
        .delete(`${endpoint}/${sample_orders[1]._id}`)
        .set("authorization", `Bearer ${tokens.expiredAdmin}`);
      expect(response.status).toBe(403);
    });

    test("Return 200 and the deleted order for successful request", async () => {
      // A customer may delete their order!
      // TODO Implement me!

      const response = await request
        .delete(`${endpoint}/${sample_orders[1]._id}`)
        .set("authorization", `Bearer ${tokens.customer1}`);
      expect(response.status).toBe(200);
      expect(response.body.data._id).toBe(sample_orders[1]._id);
    });
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });
});

//close database properly with "afterAll"
//change the test files from test to .test
