const faker = require("faker");
const Order = require("../../server/model/Order");

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
  const my_users = [];
  const my_prods = [];
  const my_ords = [];

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);

    // You may want to do more in here, e.g. initialize
    // the variables used by all the tests!

    //we have 2 users and an admin that "signed up"

    my_users[0] = await users.create({
      username: "Muneer",
      password: "test234",
      role: "ADMIN",
    });

    my_users[1] = await users.create({
      username: "Muzzi",
      password: "test123",
      role: "CUSTOMER",
    });

    my_users[2] = await users.create({
      username: "Muneeza",
      password: "test345",
      role: "CUSTOMER",
    });
    my_users[3] = await users.create({
      username: "Laibah",
      password: "test456",
      role: "CUSTOMER",
    });
    my_users[4] = await users.create({
      username: "Tahir",
      password: "test678",
      role: "CUSTOMER",
    });
    my_users[5] = await users.create({
      username: "Ibrahim",
      password: "test789",
      role: "CUSTOMER",
    });
    tokens.invisiblecust = await createToken({});
    tokens.ghostcustcustomer = await createToken({
      _id: new mongoose.Types.ObjectId(),
      username: "Missing Customer",
      role: "CUSTOMER",
    });
    tokens.invalid = "itegiuyhetryigheriruhnguiwhet1289895t89";
    tokens.timedOutAdmin = await createToken({ role: "ADMIN" }, -5);
    tokens.administrator = await createToken(my_users[0]);
    tokens.Muzzi = await createToken(my_users[1]);
    tokens.Muneeza = await createToken(my_users[2]);
    tokens.Laibah = await createToken(my_users[3]);
    tokens.Tahir = await createToken(my_users[4]);
    tokens.Ibrahim = await createToken(my_users[5]);

    //We have 4 books in our product list!
    my_prods[0] = await products.create({
      name: "Prod0",
      price: 5.0,
    });
    my_prods[1] = await products.create({
      name: "Prod1",
      price: 15.0,
    });
    my_prods[2] = await products.create({
      name: "Prod2",
      price: 1.0,
    });
    my_prods[3] = await products.create({
      name: "Prod3",
      price: 20.9,
    });
    my_prods[4] = await products.create({
      name: "Prod4",
      price: 26.0,
    });

    my_ords[0] = await order.create({
      customer: my_users[1]._id,
      products: [
        create_product_object(my_prods[4], 2),
        create_product_object(my_prods[2], 1),
        create_product_object(my_prods[1], 1),
      ],
    });

    my_ords[1] = await order.create({
      customer: my_users[1]._id,
      products: [create_product_object(my_prods[4], 1)],
    });

    my_ords[2] = await order.create({
      customer: my_users[2]._id,
      products: [create_product_object(my_prods[3], 1)],
    });

    my_ords[3] = await order.create({
      customer: my_users[2]._id,
      products: [create_product_object(my_prods[2], 1)],
    });
    my_ords[4] = await order.create({
      customer: my_users[5]._id,
      products: [create_product_object(my_prods[3], 1)],
    });

    //update my_ords[1] to have COMPLETE
    my_ords[1] = await order.update(my_ords[1]._id, my_users[1]._id, {
      status: "COMPLETE",
    });
    // console.log(tokens, my_users, my_prods, my_ords);
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

    test("Return 403 for timedOut token", async () => {
      const response = await request
        .get(endpoint)
        .set("authorization", `Bearer ${tokens.timedOutAdmin}`);
      expect(response.status).toBe(403);
    });

    describe("Return 200 and list of orders for successful request", () => {
      test("Admin can see any order", async () => {
        const response = await request
          .get(endpoint)
          .set("authorization", `Bearer ${tokens.administrator}`);
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(my_ords.length);
      });
    });

    describe(`Test GET ${endpoint} with query parameter`, () => {
      describe("Admin can see any order", () => {
        test("Return 200 and the order for a given customer", async () => {
          const cust_id = my_users[1]._id;
          const response = await request
            .get(`${endpoint}?customer=${cust_id}`)
            .set("authorization", `Bearer ${tokens.administrator}`);
          expect(response.status).toBe(200);
          //first customer made 2 separate orders in "BeforeAll"
          expect(response.body.data.length).toBe(2);
        });

        test("Return 200 and the orders with status of ACTIVE", async () => {
          // my_users[1] has one active order and one complete order
          const cust_id = my_users[1]._id;
          const status = "ACTIVE";
          const response = await request
            .get(`${endpoint}?customer=${cust_id}&status=${status}`)
            .set("authorization", `Bearer ${tokens.administrator}`);
          expect(response.status).toBe(200);
          expect(response.body.data.length).toBe(1);
        });

        test("Return 200 and the orders with status of COMPLETE", async () => {
          // my_users[1] has one active order and one complete order
          const cust_id = my_users[1]._id;
          const status = "COMPLETE";
          const response = await request
            .get(`${endpoint}?customer=${cust_id}&status=${status}`)
            .set("authorization", `Bearer ${tokens.administrator}`);
          expect(response.status).toBe(200);
          expect(response.body.data.length).toBe(1);
        });
      });

      describe("Customer can see their order(s)", () => {
        test("Return 200 and the order for a given customer", async () => {
          const cust_id = my_users[1]._id;
          const response = await request
            .get(`${endpoint}?customer=${cust_id}`)
            .set("authorization", `Bearer ${tokens.Muzzi}`);
          expect(response.status).toBe(200);
          //first customer made 2 separate orders in "BeforeAll"
          expect(response.body.data.length).toBe(2);
        });

        test("Return 200 and this customer's orders with status of ACTIVE", async () => {
          // first customer has 1 active order and 1 complete order
          const cust_id = my_users[1]._id;
          const status = "ACTIVE";
          const response = await request
            .get(`${endpoint}?customer=${cust_id}&status=${status}`)
            .set("authorization", `Bearer ${tokens.Muzzi}`);
          expect(response.status).toBe(200);
          expect(response.body.data.length).toBe(1);
        });

        test("Return 200 and this customer's orders with status of COMPLETE", async () => {
          //first customer has 1 active order and 1 complete order
          const cust_id = my_users[1]._id;
          const status = "COMPLETE";
          const response = await request
            .get(`${endpoint}?customer=${cust_id}&status=${status}`)
            .set("authorization", `Bearer ${tokens.Muzzi}`);
          expect(response.status).toBe(200);
          expect(response.body.data.length).toBe(1);
        });
      });

      test("Return 200 and an empty list for orders with invalid customer query", async () => {
        //customer3 didn't actually order anything, we just use customer3's id to simulate an "invalid" query
        const cust_id = my_users[3]._id;
        const response = await request
          .get(`${endpoint}?customer=${cust_id}`)
          .set("authorization", `Bearer ${tokens.Laibah}`);
        expect(response.status).toBe(200);
        // console.log(response.body.data);
        expect(response.body.data.length).toBe(0);
      });

      test("Return 200 and an empty list for orders with invalid status query", async () => {
        const cust_id = my_users[1]._id;
        const status = "YouMustBeNutzz!";
        const response = await request
          .get(`${endpoint}?customer=${cust_id}&status=${status}`)
          .set("authorization", `Bearer ${tokens.Muzzi}`);
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(0);
      });
    });

    // afterAll(async () => {
    //   for (const sample of my_ords) {
    //     await order.delete(sample._id, sample.customer);
    //   }
    // });
  });

  describe(`Test GET ${endpoint}/:id`, () => {
    test("Return 404 for invalid order ID", async () => {
      const orderID = "You Must be Nutz!";
      const response = await request
        .get(`${endpoint}/${orderID}`)
        .set("authorization", `Bearer ${tokens.administrator}`);
      expect(response.status).toBe(404);
    });

    test("Return 403 for missing token", async () => {
      const orderID = my_ords[0]._id;
      const response = await request.get(`${endpoint}/${orderID}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      // TODO Implement me!

      const orderID = my_ords[0]._id;
      const response = await request
        .get(`${endpoint}/${orderID}`)
        .set("authorization", `Bearer ${tokens.invalid}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for unauthorized token", async () => {
      // An admin can see any order, however a customer should not be allowed to
      //  see other customers' orders
      // customer 1 ordered my_ords[0] therefore customer 2 shouldn't have access
      const orderID = my_ords[0]._id;
      const response = await request
        .get(`${endpoint}/${orderID}`)
        .set("authorization", `Bearer ${tokens.Muneeza}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for timedOut token", async () => {
      // TODO Implement me!
      const orderID = my_ords[0]._id;
      const response = await request
        .get(`${endpoint}/${orderID}`)
        .set("authorization", `Bearer ${tokens.timedOutAdmin}`);
      expect(response.status).toBe(403);
    });

    describe("Return 200 and the order for successful request", () => {
      test("Admin can see any order", async () => {
        // TODO Implement me!
        const orderID = my_ords[1]._id;
        const response = await request
          .get(`${endpoint}/${orderID}`)
          .set("authorization", `Bearer ${tokens.administrator}`);
        expect(response.status).toBe(200);
        // console.log(response.body.data);
        expect(response.body.data.length).toBe(1);
      });

      test("Customer can see their order only", async () => {
        // TODO Implement me!
        //customer1 did in fact order my_ords[1]!
        const orderID = my_ords[1]._id;
        const response = await request
          .get(`${endpoint}/${orderID}`)
          .set("authorization", `Bearer ${tokens.Muzzi}`);
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

    test("Return 403 for timedOut token", async () => {
      const response = await request
        .post(endpoint)
        .set("authorization", `Bearer ${tokens.timedOutAdmin}`);
      expect(response.status).toBe(403);
    });

    test("Return 400 for missing customer", async () => {
      // TODO Implement me!
      const response = await request
        .post(endpoint)
        .set("authorization", `Bearer ${tokens.invisiblecust}`);
      expect(response.status).toBe(400);
    });

    test("Return 404 for non-existing customer", async () => {
      // A token with a user ID that resembles a valid mongoose ID
      //  however, there is no user in the database with that ID!
      // TODO Implement me!
      const response = await request
        .post(endpoint)
        .set("authorization", `Bearer ${tokens.ghostcustcustomer}`);
      expect(response.status).toBe(404);
    });

    test("Return 400 for missing payload", async () => {
      // TODO Implement me!
      const response = await request
        .post(endpoint)
        .set("authorization", `Bearer ${tokens.Muzzi}`);
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
              product: my_prods[0]._id,
              quantity: -5,
            },
          ],
        })
        .set("authorization", `Bearer ${tokens.Muzzi}`);
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
              quantity: 6,
            },
          ],
        })
        .set("authorization", `Bearer ${tokens.Muzzi}`);
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
              product: "invalid mongoose id",
              quantity: 88,
            },
          ],
        })
        .set("authorization", `Bearer ${tokens.Muzzi}`);
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
              product: my_prods[0]._id,
              quantity: 7,
            },
          ],
        })
        .set("authorization", `Bearer ${tokens.Muzzi}`);
      expect(response.status).toBe(201);
      expect(response.body.data[0].status).toBe("ACTIVE");
      expect(response.body.data[0].total).toBe(my_prods[0].price);
    });
  });

  describe(`Test DELETE ${endpoint}/:id`, () => {
    test("Return 404 for invalid order ID", async () => {
      const invalid_id = new mongoose.Types.ObjectId();
      const response = await request
        .delete(`${endpoint}/${invalid_id}`)
        .set("authorization", `Bearer ${tokens.Muzzi}`);
      expect(response.status).toBe(404);
    });

    test("Return 403 for missing token", async () => {
      const response = await request.delete(`${endpoint}/${my_ords[0]._id}`);
      expect(response.status).toBe(403);
    });

    test("Return 403 for invalid token", async () => {
      const response = await request
        .delete(`${endpoint}/${my_ords[0]._id}`)
        .set("authorization", `Bearer ${tokens.invalidAdmin}`);
      expect(response.status).toBe(403);
    });

    describe("Return 403 for unauthorized token", () => {
      test("Admins not allowed to delete others' orders", async () => {
        const response = await request
          .delete(`${endpoint}/${my_ords[1]._id}`)
          .set("authorization", `Bearer ${tokens.administrator}`);
        expect(response.status).toBe(403);
      });

      test("Customers not allowed to delete others' orders", async () => {
        // TODO Implement me!

        const response = await request
          .delete(`${endpoint}/${my_ords[1]._id}`)
          .set("authorization", `Bearer ${tokens.Muneeza}`);
        console.log("data:", response.body.data);
        expect(response.status).toBe(403);
      });
    });

    test("Return 403 for timedOut token", async () => {
      // TODO Implement me!
      const response = await request
        .delete(`${endpoint}/${my_ords[1]._id}`)
        .set("authorization", `Bearer ${tokens.timedOutAdmin}`);
      expect(response.status).toBe(403);
    });

    test("Return 200 and the deleted order for successful request", async () => {
      // A customer may delete their order!
      // TODO Implement me!

      const response = await request
        .delete(`${endpoint}/${my_ords[1]._id}`)
        .set("authorization", `Bearer ${tokens.Muzzi}`);
      expect(response.status).toBe(200);
      expect(response.body.data._id).toBe(my_ords[1]._id);
    });
  });

  afterAll(async () => {
    for (const ord of my_ords) {
      await Order.findByIdAndDelete(ord._id).lean().select("-__v");
    }
    for (const prod of my_prods) {
      await products.delete(prod._id);
    }

    for (const user of my_users) {
      await users.delete(user._id);
    }
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });
});
