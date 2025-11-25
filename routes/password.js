const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

// Step 1: User enters email to request reset
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'No user found with this email' });

    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');
    const expiry = Date.now() + 15 * 60 * 1000; // Valid for 15 minutes

    user.resetToken = resetToken;
    user.resetTokenExpiry = expiry;
    await user.save();

    // Local reset link (shown on screen)
    const resetLink = `http://localhost:3000/reset-password.html?token=${resetToken}`;

    res.json({ message: 'Reset link generated', resetLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Step 2: User sets new password using token
router.post('/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }  // token still valid
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    // Update password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = passwordHash;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ message: 'Password reset successful. Please login.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
