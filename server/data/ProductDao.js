const Product = require("../model/Product");
const ApiError = require("../model/ApiError");

class ProductDao {
  async create({ name, price }) {
    if (name === undefined || name === "") {
      throw new ApiError(400, "Every product must have a none-empty name!");
    }

    if (price === undefined || isNaN(price) || price < 0) {
      throw new ApiError(
        400,
        "Every product must a non-negative price attribute!"
      );
    }

    const product = await Product.create({ name, price });
    return {
      _id: product._id.toString(),
      name: product.name,
      price: product.price,
    };
  }

  async update(id, { name, price }) {
    await this.read(id);
    return Product.findByIdAndUpdate(
      id,
      { name, price },
      { new: true, runValidators: true }
    )
      .lean()
      .select("-__v");
  }

  async delete(id) {
    await this.read(id);
    return Product.findByIdAndDelete(id).lean().select("-__v");
  }

  async read(id) {
    const product = await Product.findById(id).lean().select("-__v");

    if (product === null) {
      throw new ApiError(404, "There is no product with the given ID!");
    }

    return product;
  }

  // returns an empty array if there is no product in the database
  //  or no product matches the search query
  async readAll(query = "", minPrice, maxPrice) {
    let products = await Product.find({}).lean().select("-__v");

    if (query !== "") {
      products = products.filter((product) =>
        product.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (minPrice && !isNaN(minPrice)) {
      products = products.filter((product) => product.price >= minPrice);
    }

    if (maxPrice && !isNaN(maxPrice)) {
      products = products.filter((product) => product.price <= maxPrice);
    }

    return products;
  }
}

module.exports = ProductDao;
