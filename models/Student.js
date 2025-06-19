const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: String,
  GRNumber: { type: String, unique: true },
  rollNumber: String,
  standard: { type: String, enum: ["8", "9", "10", "11", "12"] },
  stream: { type: String, enum: ["Science", "Commerce", "Arts", null], default: null },
  contactInfo: {
    email: String,
    phone: String,
    address: String,
  },
});

module.exports = mongoose.model("Student", studentSchema);
