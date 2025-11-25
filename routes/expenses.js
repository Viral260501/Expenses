const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');

const Expense = require('../models/Expense');
const User = require('../models/User');

// Employee: create expense
router.post('/', auth, async (req, res) => {
  try {
    const { title, amount, date, description, receiptUrl } = req.body;
    if (!title || !amount) return res.status(400).json({ message: 'Title and amount required' });

    const expense = new Expense({
      title,
      amount,
      date: date ? new Date(date) : Date.now(),
      description,
      receiptUrl,
      createdBy: req.user.userId
    });

    await expense.save();
    res.json(expense);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Employee: list their expenses (with optional month filter)
router.get('/me', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = { createdBy: req.user.userId };
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      query.date = { $gte: start, $lt: end };
    }
    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Manager: list all expenses (optional status filter)
router.get('/', auth, requireRole('manager'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    const expenses = await Expense.find(query).populate('createdBy', 'name email').sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Manager: approve or reject an expense
router.post('/:id/decision', auth, requireRole('manager'), async (req, res) => {
  try {
    const { decision } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Invalid decision' });

    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    expense.status = decision;
    expense.approvedBy = req.user.userId;
    expense.approvedAt = new Date();

    await expense.save();
    res.json(expense);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Manager: get expense totals per user or monthly stats (simple example)
router.get('/stats/totals-by-user', auth, requireRole('manager'), async (req, res) => {
  try {
    const totals = await Expense.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$createdBy', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 0, userId: '$user._id', name: '$user.name', email: '$user.email', totalAmount: 1, count: 1 } }
    ]);
    res.json(totals);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
