// controllers/resultController.js

const XLSX = require('xlsx');
const Student = require('../models/Student');
const Result = require('../models/Result');
const fs = require('fs');
const path = require('path');

// Function to calculate grade based on percentage
const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

// Upload and process Excel file
exports.uploadResults = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const results = [];
    const errors = [];

    for (const [index, row] of data.entries()) {
      try {
        const {
          GRNumber,
          rollNumber,
          name,
          standard,
          stream,
          academicYear,
          ...subjects
        } = row;

        console.log('Processing row:', { GRNumber, rollNumber, name, standard, stream, academicYear }); // Add this log

        if (!GRNumber || !rollNumber || !name || !standard || !academicYear) {
          throw new Error('Missing required fields');
        }

        // Find or create student
        let student = await Student.findOneAndUpdate(
          { GRNumber },
          { name, rollNumber, standard, stream },
          { upsert: true, new: true }
        );

        const subjectEntries = Object.entries(subjects).map(([key, value]) => {
          const marks = Number(value);
          if (isNaN(marks) || marks < 0 || marks > 100) {
            throw new Error(`Invalid marks for subject ${key}: ${value}`);
          }
          return { name: key, marks };
        });

        const totalMarks = subjectEntries.reduce((sum, subj) => sum + subj.marks, 0);
        const percentage = (totalMarks / subjectEntries.length).toFixed(2);
        const grade = calculateGrade(Number(percentage));

        // Create or update result
        const result = await Result.findOneAndUpdate(
          { studentId: student._id, academicYear },
          {
            subjects: subjectEntries,
            totalMarks,
            percentage,
            grade,
          },
          { upsert: true, new: true }
        );

        console.log('Saved result:', result); // Add this log

        results.push(result);
      } catch (error) {
        errors.push(`Row ${index + 2}: ${error.message}`);
      }
    }

    res.status(200).json({ 
      message: 'Results processed.',
      successCount: results.length,
      errorCount: errors.length,
      errors: errors
    });
  } catch (error) {
    console.error('Error uploading results:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Fetch result by GR Number or Roll Number
exports.getResult = async (req, res) => {
  try {
    const { identifier, standard, stream } = req.query;

    console.log('Searching for:', { identifier, standard, stream }); // Add this log

    // Find student
    const student = await Student.findOne({
      $or: [{ GRNumber: identifier }, { rollNumber: identifier }],
      standard,
      ...(standard === '11' || standard === '12' ? { stream } : {}),
    });

    console.log('Found student:', student); // Add this log

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Fetch latest result
    const result = await Result.findOne({ studentId: student._id }).sort({ academicYear: -1 });

    console.log('Found result:', result); // Add this log

    if (!result) {
      return res.status(404).json({ error: 'Result not found.' });
    }

    res.status(200).json({ student, result });
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};