const Order = require("../model/Order");
const ApiError = require("../model/ApiError");
const mongoose = require("mongoose");
const ProductDao = require("../data/ProductDao");
const User_Dao = require("../data/UserDao");
const product_dao = new ProductDao();
const users = new User_Dao();

// TODO: Implement the operations of OrderDao.
//  Do not change the signature of any of the operations!
//  You may add helper functions, other variables, etc, as the need arises!

class OrderDao {
  // When an order is created, it is in "active" state
  async calculate_total(products) {
    let total = 0;
    for (const product of products) {
      if (isNaN(product.quantity) || product.quantity <= 0) {
        throw new ApiError(400, "Porduct has invalid quantityy");
      }
      if (!mongoose.isValidObjectId(product.product)) {
        throw new ApiError(400, "Prduct has invalid id");
      }
      let product_value = await product_dao.read(product.product);
      total = product.quantity * product_value.price;
    }
    return total;
  }

  async create({ customer, products }) {
    // Hint: Total price is computer from the list of products.

    // TODO Impelment me
    if (customer === undefined || customer === "") {
      throw new ApiError(400, "Every product must have a none-empty name!");
    }
    await users.read(customer);
    if (products === undefined || products === null) {
      throw new ApiError(400, "Every order must have a product!");
    }

    products.map((product) => {
      if (product.quantity <= 0) {
        throw new ApiError(400, []);
      }
    });

    let total = await this.calculate_total(products);
    const order = await Order.create({ total, customer, products });
    let new_products = [];
    for (const product of order.products) {
      new_products.push({
        _id: product._id.toString(),
        product: product.product.toString(),
        quantity: product.quantity,
      });
    }
    return {
      _id: order._id.toString(),
      status: order.status,
      customer: order.customer.toString(),
      total: order.total,
      products: new_products,
    };
  }

  async read(id, customer, role) {
    // Hint:
    //  If role==="ADMIN" then return the order for the given ID
    //  Otherwise, only return it if the customer is the one who placed the order!

    // TODO Implement me!
    if (!mongoose.isValidObjectId(id)) {
      throw new ApiError(404, "invalid id");
    }
    let order;
    if (role !== "ADMIN") {
      order = await Order.find({ _id: id, customer, customer });
    } else {
      order = await Order.find({ _id: id });
    }

    return order;
  }

  // Pre: The requester is an ADMIN or is the customer!
  //  The route handler must verify this!
  async readAll(query = "", status, customer) {
    // Hint:
    //  The customer and status parameters are filters.
    //  For example, one may search for all "ACTIVE" orders for the given customer.

    // TODO Implement me!
    let orders = await Order.find({}).lean().select("-__v");

    if (query !== "") {
      orders = orders.filter((order) =>
        order.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (customer && customer !== "") {
      orders = orders.filter((order) => order.customer.toString() == customer);
    }

    if (status && status !== "") {
      orders = orders.filter((order) => order.status === status);
    }

    return orders;
  }

  async delete(id, customer) {
    // Hint: The customer must be the one who placed the order!

    // TODO Implement me!

    return Order.findOneAndDelete({ _id: id, customer: customer })
      .lean()
      .select("-__v");
  }

  // One can update the list of products or the status of an order
  async update(id, customer, { products, status }) {
    // Hint: The customer must be the one who placed the order!

    // TODO Implement me!
    await this.read(customer);
    return Order.findByIdAndUpdate(
      id,
      { customer, products, status },
      { new: true, runValidators: true }
    )
      .lean()
      .select("-__v");
  }
}

module.exports = OrderDao;
