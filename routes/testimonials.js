const express = require('express');
const router = express.Router();

// Temporary placeholder for testimonials
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'Sarah Johnson',
        text: 'Amazing service! The staff is professional and friendly.',
        rating: 5,
        service: 'Hair Styling'
      },
      {
        id: 2,
        name: 'Michael Chen',
        text: 'Best salon experience ever. Highly recommend!',
        rating: 5,
        service: 'Barber Services'
      },
      {
        id: 3,
        name: 'Emily Williams',
        text: 'Love my new look! The team really listens to what you want.',
        rating: 5,
        service: 'Color Treatment'
      }
    ]
  });
});

module.exports = router;