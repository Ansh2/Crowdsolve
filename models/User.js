const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const VALID_CITIES = ['Ahmedabad', 'Rajkot', 'Surat', 'Vadodara', 'Anand'];
const DEPARTMENTS = ['roads', 'water', 'electricity', 'traffic', 'sanitation', 'parks', 'drainage', 'garbage'];

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ['citizen', 'district_magistrate', 'department_head'],
    default: 'citizen'
  },
  city: { type: String, required: true, enum: VALID_CITIES },
  department: { type: String, enum: [...DEPARTMENTS, null], default: null },
  avatar: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
User.VALID_CITIES = VALID_CITIES;
User.DEPARTMENTS = DEPARTMENTS;
module.exports = User;
