const express = require("express");
const { checkToken, checkAdmin } = require("../util/middleware");
const orderDao = require("../data/OrderDao");
const userDao = require("../data/UserDao");
const ProductDao = require("../data/ProductDao");
const ApiError = require("../model/ApiError");

const mongoose = require("mongoose");

const router = express.Router();
const orders = new orderDao();
const users = new userDao();
const products = new ProductDao();

router.get("/api/orders", checkToken, async (req, res, next) => {
  try {
    // TODO Implement Me!
    const { query, status, customer } = req.query;
    if ((customer && customer == "") || (status && status == "")) {
      throw new ApiError(200, []);
    }
    const data = await orders.readAll(query, status, customer);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get("/api/orders/:id", checkToken, async (req, res, next) => {
  try {
    // TODO Implement Me!
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new ApiError(404, "Invalid order ID!");
    } else {
      const data = await orders.read(id, req.user.sub, req.user.role);
      res.json({ data });
    }

    // res.json("cool");
  } catch (err) {
    next(err);
  }
});

router.post("/api/orders", checkToken, async (req, res, next) => {
  try {
    // TODO Implement Me!
    let user = await users.read(req.user.sub);
    if (user === null) {
      throw new ApiError(404, "Unable to find specified user");
    }

    if (!req.hasOwnProperty("body")) {
      throw new ApiError(400, []);
    }

    const { products } = req.body;

    // if (!products) {
    //   throw new ApiError(404, "Every order must have a product!");
    // }

    let customer = req.user.sub;
    const data = await orders.create({ customer, products });
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/orders/:id", checkToken, async (req, res, next) => {
  try {
    // TODO Implement Me!
    const { id } = req.params;

    const order = await orders.read(id, req.user.sub, req.user.role);
    if (order.length === 0) {
      throw new ApiError(404, "Invalid order ID");
    }

    order.map((order) => {
      console.log("customer:", order.customer.toString());
      console.log("request-user:", req.user.sub);
      if (order.customer.toString() !== req.user.sub) {
        throw new ApiError(403, "Unauthorized");
      }
    });

    const data = await orders.delete(id, req.user.sub);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.put("/api/orders/:id", checkToken, async (req, res, next) => {
  try {
    // TODO Implement Me!
  } catch (err) {
    next(err);
  }
});

module.exports = router;
