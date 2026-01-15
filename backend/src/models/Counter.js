const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema({
  uf: { type: String, required: true, unique: true }, // "SP"
  seq: { type: Number, default: 0 }
});

module.exports = mongoose.model("Counter", CounterSchema);
