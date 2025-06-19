// routes/resultRoutes.js

const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const upload = require('../middleware/uploadMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

// Upload results (Admin only)
router.post('/upload', authMiddleware.verifyToken, upload.single('file'), resultController.uploadResults);

// Get result by GR Number or Roll Number
router.get('/student', resultController.getResult);

module.exports = router;