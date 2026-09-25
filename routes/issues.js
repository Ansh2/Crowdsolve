const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, isGovernment, isDistrictMagistrate } = require('../middleware/auth');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET all issues with filters — citizens see only their city's issues
router.get('/', async (req, res) => {
  try {
    const { city, category, status, sort, search, page = 1, limit = 10 } = req.query;
    const query = {};
    if (city) query['location.city'] = new RegExp(`^${city}$`, 'i');
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) query.$or = [{ title: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }];

    let sortObj = { createdAt: -1 };
    if (sort === 'trending') sortObj = { upvoteCount: -1 };
    if (sort === 'oldest') sortObj = { createdAt: 1 };

    const total = await Issue.countDocuments(query);
    const issues = await Issue.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('author', 'name');

    res.json({ success: true, total, pages: Math.ceil(total / limit), issues });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET top 10 issues by city
router.get('/top10', async (req, res) => {
  try {
    const { city } = req.query;
    const query = city ? { 'location.city': new RegExp(`^${city}$`, 'i') } : {};
    const issues = await Issue.find(query).sort({ upvoteCount: -1 }).limit(10).populate('author', 'name');
    res.json({ success: true, issues });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET department heads for a city (DM use) — MUST be before /:id to avoid route conflict
router.get('/admin/dept-heads', protect, isDistrictMagistrate, async (req, res) => {
  try {
    const heads = await User.find({ role: 'department_head', city: new RegExp(`^${req.user.city}$`, 'i') })
      .select('name email department city');
    res.json({ success: true, heads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single issue
router.get('/:id', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('author', 'name city')
      .populate('assignment.assignedTo', 'name department')
      .populate('assignment.assignedBy', 'name');
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    res.json({ success: true, issue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create issue
router.post('/', protect, upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, category, priority, address, city, pincode, lat, lng, tags } = req.body;

    // Citizens can only report issues in their own city
    if (req.user.role === 'citizen' && req.user.city !== city) {
      return res.status(403).json({ success: false, message: 'You can only report issues in your city' });
    }

    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    const issue = await Issue.create({
      title, description, category, priority,
      location: { address, city, pincode, coordinates: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 } },
      images,
      author: req.user._id,
      authorName: req.user.name,
      tags: tags ? tags.split(',').map(t => t.trim()) : []
    });

    // Check if this issue makes city top 10 and notify DM
    const top10 = await Issue.find({ 'location.city': new RegExp(`^${city}$`, 'i') })
      .sort({ upvoteCount: -1 }).limit(10);
    const isTop10 = top10.some(i => i._id.toString() === issue._id.toString());
    if (isTop10) {
      const dm = await User.findOne({ role: 'district_magistrate', city: new RegExp(`^${city}$`, 'i') });
      if (dm) {
        await Notification.create({
          recipient: dm._id,
          type: 'top10_alert',
          issue: issue._id,
          message: `New issue entered Top 10 in ${city}: "${issue.title}"`
        });
      }
    }

    res.status(201).json({ success: true, issue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT upvote issue
router.put('/:id/upvote', protect, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const userId = req.user._id.toString();
    const alreadyUpvoted = issue.upvotes.some(id => id.toString() === userId);
    if (alreadyUpvoted) {
      issue.upvotes = issue.upvotes.filter(id => id.toString() !== userId);
    } else {
      issue.upvotes.push(req.user._id);
    }
    issue.upvoteCount = issue.upvotes.length;
    await issue.save();

    // Check top 10 after upvote and notify DM if new entry
    const city = issue.location.city;
    const top10 = await Issue.find({ 'location.city': new RegExp(`^${city}$`, 'i') })
      .sort({ upvoteCount: -1 }).limit(10).select('_id');
    const isTop10 = top10.some(i => i._id.toString() === issue._id.toString());
    if (isTop10 && !alreadyUpvoted) {
      const dm = await User.findOne({ role: 'district_magistrate', city: new RegExp(`^${city}$`, 'i') });
      if (dm) {
        const exists = await Notification.findOne({ recipient: dm._id, issue: issue._id, type: 'top10_alert' });
        if (!exists) {
          await Notification.create({
            recipient: dm._id,
            type: 'top10_alert',
            issue: issue._id,
            message: `Issue "${issue.title}" is now in Top 10 for ${city} with ${issue.upvoteCount} upvotes`
          });
        }
      }
    }

    res.json({ success: true, upvoteCount: issue.upvoteCount, upvoted: !alreadyUpvoted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST comment
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    issue.comments.push({ user: req.user._id, userName: req.user.name, text: req.body.text });
    await issue.save();
    res.json({ success: true, comments: issue.comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update status (government only)
router.put('/:id/status', protect, isGovernment, async (req, res) => {
  try {
    const { status, governmentNote } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    // City check
    if (issue.location.city.toLowerCase() !== req.user.city.toLowerCase()) {
      return res.status(403).json({ success: false, message: 'You can only manage issues in your city' });
    }

    // Department head can only update issues assigned to them
    if (req.user.role === 'department_head') {
      const assignedDept = issue.assignment && issue.assignment.departmentName;
      if (!assignedDept || assignedDept !== req.user.department) {
        return res.status(403).json({ success: false, message: 'This issue is not assigned to your department' });
      }
    }

    issue.status = status;
    issue.governmentNote = governmentNote;
    issue.updatedAt = Date.now();
    if (status === 'completed') issue.resolvedAt = Date.now();
    await issue.save();

    res.json({ success: true, issue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT assign issue to department head (DM only)
router.put('/:id/assign', protect, isDistrictMagistrate, async (req, res) => {
  try {
    const { departmentHeadId, deadline, notes } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    if (issue.location.city.toLowerCase() !== req.user.city.toLowerCase()) {
      return res.status(403).json({ success: false, message: 'You can only assign issues in your city' });
    }

    const deptHead = await User.findById(departmentHeadId);
    if (!deptHead || deptHead.role !== 'department_head') {
      return res.status(400).json({ success: false, message: 'Invalid department head' });
    }

    const deadlineDate = new Date(deadline);
    const formattedDeadline = deadlineDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const formalLetter = `
GOVERNMENT OF GUJARAT
OFFICE OF THE DISTRICT MAGISTRATE
${req.user.city.toUpperCase()}

Ref No: CP/${issue._id.toString().slice(-6).toUpperCase()}/${new Date().getFullYear()}
Date: ${today}

TO,
${deptHead.name}
Head, Department of ${deptHead.department.charAt(0).toUpperCase() + deptHead.department.slice(1)}
${req.user.city}

SUBJECT: Assignment of Public Issue – ${issue.title.toUpperCase()}

Dear ${deptHead.name},

This is to inform you that a public issue of critical concern has been reported through the CrowdSolve platform and has entered the Top 10 most upvoted issues in ${req.user.city}. You are hereby directed to take immediate action.

ISSUE DETAILS:
─────────────────────────────────────────
Issue ID    : ${issue._id.toString().slice(-8).toUpperCase()}
Title       : ${issue.title}
Category    : ${issue.category.toUpperCase()}
Priority    : ${issue.priority.toUpperCase()}
Location    : ${issue.location.address}, ${issue.location.city}
Reported By : ${issue.authorName}
Upvotes     : ${issue.upvoteCount} citizens affected

DESCRIPTION:
${issue.description}

${notes ? `SPECIAL INSTRUCTIONS:\n${notes}\n` : ''}
TIMELINE:
You are required to resolve the above issue by ${formattedDeadline}. Failure to complete within the stipulated deadline will result in escalation to higher authorities.

Please acknowledge receipt of this letter and provide a weekly progress report.

Yours faithfully,

${req.user.name}
District Magistrate
${req.user.city}

─────────────────────────────────────────
This is an official communication generated via CrowdSolve Platform
    `.trim();

    issue.assignment = {
      assignedTo: deptHead._id,
      departmentName: deptHead.department,
      assignedBy: req.user._id,
      assignedAt: new Date(),
      deadline: deadlineDate,
      formalLetter,
      deadlineNotificationSent: false
    };
    issue.status = 'assigned';
    issue.updatedAt = Date.now();
    await issue.save();

    // Notify dept head
    await Notification.create({
      recipient: deptHead._id,
      type: 'assignment',
      issue: issue._id,
      message: `You have been assigned issue: "${issue.title}" by District Magistrate ${req.user.name}. Deadline: ${formattedDeadline}`
    });

    res.json({ success: true, issue, formalLetter });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT upload proof (government only)
router.put('/:id/proof', protect, isGovernment, upload.array('proofImages', 5), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const proofImages = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    issue.proof = { images: proofImages, description: req.body.description, uploadedBy: req.user._id };
    issue.status = 'completed';
    issue.resolvedAt = Date.now();
    await issue.save();

    res.json({ success: true, issue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
