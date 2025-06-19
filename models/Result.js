// models/Result.js

const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subjects: [
    {
      name: String,
      marks: Number,
    },
  ],
  totalMarks: Number,
  percentage: Number,
  grade: String,
  academicYear: String,
});

module.exports = mongoose.model('Result', resultSchema);
