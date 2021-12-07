const express = require("express");
const ProductDao = require("../data/ProductDao");
const ApiError = require("../model/ApiError");
const { checkAdmin } = require("../util/middleware");

const router = express.Router();
const products = new ProductDao();

router.get("/api/products", async (req, res, next) => {
  try {
    const { query, minPrice, maxPrice } = req.query;
    if ((minPrice && isNaN(minPrice)) || (maxPrice && isNaN(maxPrice))) {
      throw new ApiError(400, "min or max price values must be numeric!");
    }
    const data = await products.readAll(query, minPrice, maxPrice);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get("/api/products/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await products.read(id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post("/api/products", checkAdmin, async (req, res, next) => {
  try {
    const { name, price } = req.body;
    const data = await products.create({ name, price });
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/products/:id", checkAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await products.delete(id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.put("/api/products/:id", checkAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body;

    if (!name && !price) {
      throw new ApiError(
        400,
        "You must provide at least a name or price attribute!"
      );
    }

    const data = await products.update(id, { name, price });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
