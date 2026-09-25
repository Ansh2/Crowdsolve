const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'crowdsolve_secret');
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

exports.isGovernment = (req, res, next) => {
  if (!['district_magistrate', 'department_head'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Government access only' });
  }
  next();
};

exports.isDistrictMagistrate = (req, res, next) => {
  if (req.user.role !== 'district_magistrate') {
    return res.status(403).json({ success: false, message: 'District Magistrate access only' });
  }
  next();
};

exports.isDepartmentHead = (req, res, next) => {
  if (req.user.role !== 'department_head') {
    return res.status(403).json({ success: false, message: 'Department Head access only' });
  }
  next();
};
