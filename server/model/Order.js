const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["ACTIVE", "COMPLETE"],
    default: "ACTIVE",
    required: true,
  },
  total: { type: Number, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  products: [
    {
      quantity: { type: Number, required: true },
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    },
  ],
});

const Order = mongoose.model("Order", OrderSchema);

module.exports = Order;
