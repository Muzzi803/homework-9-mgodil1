require("dotenv").config();
const orders = require("./routes/orders.js");
const products = require("./routes/products.js");
const users = require("./routes/users.js");
const auth = require("./routes/auth.js");
const { globalErrorHandler } = require("./util/middleware");

const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("BookStore API!");
});

// routing
app.use(orders);
app.use(products);
app.use(users);
app.use(auth);

app.use(globalErrorHandler);

module.exports = app;
