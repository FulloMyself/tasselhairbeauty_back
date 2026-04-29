const express = require('express');
const router = express.Router();

// @route   GET /api/reviews
// @desc    Get public reviews
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Return static reviews data
    const reviews = [
      {
        id: 1,
        name: 'Google Review',
        avatar: null,
        rating: 5,
        text: 'Loved the ambiance, the ladies welcomed us with a smile. The massage took my problems away. Overall an amazing experience, I\'m definitely coming back.',
        service: 'Pedicure, Massage, Facial',
        source: 'google',
        date: '2025-05-15'
      },
      {
        id: 2,
        name: "Kayise's Mom",
        avatar: 'K',
        rating: 5,
        text: 'Thank you so much for your hospitality and professionalism. I will 100% recommend Tassel. Definitely found a home for my daughter\'s hair.',
        service: 'Kiddies Hair',
        source: 'whatsapp',
        date: '2026-03-10',
        featured: true
      },
      {
        id: 3,
        name: 'Palesa Mogale',
        avatar: 'P',
        rating: 5,
        text: 'The absolute best service ever! Your studio is absolutely gorgeous. No tears at all. Totally love it!',
        service: 'Kiddies Hair',
        source: 'whatsapp',
        date: '2026-03-15'
      }
    ];
    
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;