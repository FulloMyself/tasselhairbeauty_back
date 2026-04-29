const express = require('express');
const router = express.Router();

// Temporary placeholder for services
router.get('/', (req, res) => {
  const { featured } = req.query;
  
  // Return empty array for now
  res.json({
    success: true,
    data: [],
    message: 'Services endpoint - To be implemented in Phase 2'
  });
});

router.get('/:id', (req, res) => {
  res.json({
    success: true,
    data: null,
    message: 'Service details - To be implemented in Phase 2'
  });
});

module.exports = router;