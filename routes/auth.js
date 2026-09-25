const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'crowdsolve_secret', { expiresIn: '7d' });

// Register (citizens only via public form)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, city } = req.body;
    if (!User.VALID_CITIES.includes(city)) {
      return res.status(400).json({ success: false, message: `City must be one of: ${User.VALID_CITIES.join(', ')}` });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password, city, role: 'citizen' });
    const token = signToken(user._id);
    res.status(201).json({
      success: true, token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, city: user.city, department: user.department }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = signToken(user._id);
    res.json({
      success: true, token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, city: user.city, department: user.department }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// Get valid cities
router.get('/cities', (req, res) => {
  res.json({ success: true, cities: User.VALID_CITIES });
});

module.exports = router;
