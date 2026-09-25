const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, isGovernment, isDistrictMagistrate } = require('../middleware/auth');

// GET notifications for logged-in user
router.get('/notifications', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('issue', 'title status upvoteCount');
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT mark notification read
router.put('/notifications/:id/read', protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT mark all notifications read
router.put('/notifications/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET government dashboard stats
router.get('/stats', protect, isGovernment, async (req, res) => {
  try {
    const city = req.user.city;
    const cityQuery = { 'location.city': new RegExp(`^${city}$`, 'i') };

    // Department heads see only their dept
    let baseQuery = cityQuery;
    if (req.user.role === 'department_head') {
      baseQuery = { ...cityQuery, 'assignment.departmentName': req.user.department };
    }

    const [total, pending, inProgress, completed, byCategory, recentIssues, topIssues] = await Promise.all([
      Issue.countDocuments(baseQuery),
      Issue.countDocuments({ ...baseQuery, status: 'pending' }),
      Issue.countDocuments({ ...baseQuery, status: 'in-progress' }),
      Issue.countDocuments({ ...baseQuery, status: 'completed' }),
      Issue.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Issue.find(baseQuery).sort({ createdAt: -1 }).limit(5),
      Issue.find(baseQuery).sort({ upvoteCount: -1 }).limit(5)
    ]);

    const totalUsers = await User.countDocuments({ city: new RegExp(`^${city}$`, 'i'), role: 'citizen' });

    // Overdue issues check
    const now = new Date();
    const overdueIssues = await Issue.find({
      ...cityQuery,
      status: { $in: ['assigned', 'in-progress'] },
      'assignment.deadline': { $lt: now }
    }).select('_id title assignment');

    // Send overdue notifications to DM
    if (overdueIssues.length > 0 && req.user.role === 'district_magistrate') {
      for (const issue of overdueIssues) {
        if (!issue.assignment.deadlineNotificationSent) {
          await Notification.create({
            recipient: req.user._id,
            type: 'deadline_overdue',
            issue: issue._id,
            message: `OVERDUE: Issue "${issue.title}" assigned to ${issue.assignment.departmentName} department has passed its deadline`
          });
          await Issue.findByIdAndUpdate(issue._id, {
            status: 'overdue',
            'assignment.deadlineNotificationSent': true
          });
        }
      }
    }

    res.json({
      success: true,
      stats: {
        total, pending, inProgress, completed, totalUsers, overdueCount: overdueIssues.length,
        resolutionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
      },
      byCategory,
      recentIssues,
      topIssues
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET all issues for government
router.get('/issues', protect, isGovernment, async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = req.query;
    const city = req.user.city;
    const query = { 'location.city': new RegExp(`^${city}$`, 'i') };

    if (req.user.role === 'department_head') {
      query['assignment.departmentName'] = req.user.department;
    }

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const total = await Issue.countDocuments(query);
    const issues = await Issue.find(query)
      .sort({ priority: -1, upvoteCount: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('author', 'name email')
      .populate('assignment.assignedTo', 'name department');

    res.json({ success: true, total, pages: Math.ceil(total / limit), issues });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET top 10 issues for DM (for assignment)
router.get('/top10-dm', protect, isDistrictMagistrate, async (req, res) => {
  try {
    const city = req.user.city;
    const issues = await Issue.find({ 'location.city': new RegExp(`^${city}$`, 'i') })
      .sort({ upvoteCount: -1 })
      .limit(10)
      .populate('assignment.assignedTo', 'name department');
    res.json({ success: true, issues });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
