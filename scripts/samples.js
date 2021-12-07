require("dotenv").config();
const db = require("../server/data/db");
const User = require("../server/model/User");
const Product = require("../server/model/Product");
const Order = require("../server/model/Order");
const UserDao = require("../server/data/UserDao");
const ProductDao = require("../server/data/ProductDao");
const OrderDao = require("../server/data/OrderDao");

const users = new UserDao();
const products = new ProductDao();
const orders = new OrderDao();

async function createSampleData() {
  await db.connect(); // this should not be your production database!!
  await Order.deleteMany({}); // delete all orders!
  await User.deleteMany({}); // delete all users!
  await Product.deleteMany({}); // delete all products!

  const customer1 = await users.create({
    username: "customer1",
    password: "customer1",
    role: "CUSTOMER",
  });

  const customer2 = await users.create({
    username: "customer2",
    password: "customer2",
    role: "CUSTOMER",
  });

  const admin = await users.create({
    username: "admin",
    password: "admin",
    role: "ADMIN",
  });

  const book1 = await products.create({
    name: "Eloquent JavaScript",
    price: 20.99,
  });

  const book2 = await products.create({
    name: "JavaScript: The Good Parts",
    price: 13.69,
  });

  const book3 = await products.create({
    name: "JavaScript: The Definitive Guide",
    price: 50.69,
  });

  const order1 = await orders.create({
    customer: customer1._id,
    products: [
      {
        product: book1._id,
        quantity: 2,
      },
      {
        product: book2._id,
        quantity: 1,
      },
    ],
  });

  const order2 = await orders.create({
    customer: customer2._id,
    products: [
      {
        product: book3._id,
        quantity: 2,
      },
    ],
  });

  const order3 = await orders.create({
    customer: customer2._id,
    products: [
      {
        product: book1._id,
        quantity: 1,
      },
    ],
  });

  await orders.update(order3._id, order3.customer, { status: "COMPLETE" });

  console.log(
    admin,
    customer1,
    customer2,
    book1,
    book2,
    book3,
    order1,
    order2,
    order3
  );
}

createSampleData()
  .then(() => {
    console.log("Finished creating samples!");
    console.log("Please terminate the process by Ctrl + C");
  })
  .catch((err) => console.log(err));
