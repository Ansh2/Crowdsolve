const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const proofSchema = new mongoose.Schema({
  images: [String],
  description: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now }
});

const assignmentSchema = new mongoose.Schema({
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },       // dept head user
  departmentName: String,                                                    // e.g. 'roads'
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },       // DM
  assignedAt: { type: Date, default: Date.now },
  deadline: { type: Date, required: true },
  formalLetter: { type: String },                                            // generated letter text
  deadlineNotificationSent: { type: Boolean, default: false }
});

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['roads', 'water', 'electricity', 'sanitation', 'parks', 'drainage', 'streetlights', 'garbage', 'traffic', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'completed', 'overdue'],
    default: 'pending'
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    pincode: String,
    coordinates: { lat: Number, lng: Number }
  },
  images: [String],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: String,
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  upvoteCount: { type: Number, default: 0 },
  comments: [commentSchema],
  proof: proofSchema,
  governmentNote: String,
  assignment: assignmentSchema,
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  resolvedAt: Date
});

issueSchema.index({ upvoteCount: -1, createdAt: -1 });
issueSchema.index({ 'location.city': 1, status: 1 });

module.exports = mongoose.model('Issue', issueSchema);
