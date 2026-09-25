/**
 * CrowdSolve - Database Seeder
 * Seeds 5 Gujarat cities with DM, dept heads, citizens, and issues
 * Run: node seed.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdsolve';

const VALID_CITIES = ['Ahmedabad', 'Rajkot', 'Surat', 'Vadodara', 'Anand'];
const DEPARTMENTS = ['roads', 'water', 'electricity', 'traffic', 'sanitation', 'parks', 'drainage', 'garbage'];

// Inline schemas for seeder
const userSchema = new mongoose.Schema({
  name: String, email: String, password: String,
  role: { type: String, default: 'citizen' },
  city: String, department: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});
const issueSchema = new mongoose.Schema({
  title: String, description: String, category: String,
  status: { type: String, default: 'pending' }, priority: String,
  location: { address: String, city: String, pincode: String },
  images: [String], author: mongoose.Schema.Types.ObjectId,
  authorName: String, upvotes: [mongoose.Schema.Types.ObjectId],
  upvoteCount: { type: Number, default: 0 },
  comments: [{ user: mongoose.Schema.Types.ObjectId, userName: String, text: String, createdAt: { type: Date, default: Date.now } }],
  proof: { images: [String], description: String, uploadedAt: Date },
  governmentNote: String, tags: [String],
  assignment: {
    assignedTo: mongoose.Schema.Types.ObjectId,
    departmentName: String,
    assignedBy: mongoose.Schema.Types.ObjectId,
    assignedAt: Date, deadline: Date,
    formalLetter: String, deadlineNotificationSent: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  resolvedAt: Date
});

const User = mongoose.model('User', userSchema);
const Issue = mongoose.model('Issue', issueSchema);

// City-specific issue templates
const cityIssues = {
  Ahmedabad: [
    { title: 'Deep potholes on SG Highway causing accidents', category: 'roads', priority: 'critical', status: 'in-progress', address: 'SG Highway, near Iskcon Temple', pincode: '380015', upvoteCount: 412, daysAgo: 10, governmentNote: 'Repair crew deployed. Expected in 4 days.' },
    { title: 'No water supply in Bopal for 6 days', category: 'water', priority: 'critical', status: 'pending', address: 'Bopal Society, Bopal', pincode: '380058', upvoteCount: 356, daysAgo: 6 },
    { title: 'Streetlights off on CG Road for 2 months', category: 'streetlights', priority: 'high', status: 'completed', address: 'CG Road, Navrangpura', pincode: '380009', upvoteCount: 278, daysAgo: 60, governmentNote: 'LED lights installed.', proof: { description: '50 LEDs installed on CG Road', uploadedAt: new Date(Date.now() - 2 * 86400000) }, resolvedAt: new Date(Date.now() - 2 * 86400000) },
    { title: 'Overflowing drainage on Ashram Road', category: 'drainage', priority: 'high', status: 'in-progress', address: 'Ashram Road, Ellis Bridge', pincode: '380006', upvoteCount: 234, daysAgo: 18 },
    { title: 'Garbage pile at Maninagar for 3 weeks', category: 'garbage', priority: 'high', status: 'pending', address: 'Maninagar Cross Roads', pincode: '380008', upvoteCount: 198, daysAgo: 21 },
    { title: 'Power cuts 10+ hours in Gota area', category: 'electricity', priority: 'high', status: 'in-progress', address: 'Gota Circle, Gota', pincode: '382481', upvoteCount: 176, daysAgo: 7 },
    { title: 'Traffic signal down at Paldi Junction', category: 'traffic', priority: 'critical', status: 'pending', address: 'Paldi Junction, Ahmedabad', pincode: '380007', upvoteCount: 162, daysAgo: 4 },
    { title: 'Open manhole on Sardar Patel Ring Road', category: 'sanitation', priority: 'critical', status: 'pending', address: 'SP Ring Road, Nikol', pincode: '382350', upvoteCount: 148, daysAgo: 3 },
    { title: 'Park benches broken in Law Garden', category: 'parks', priority: 'medium', status: 'in-progress', address: 'Law Garden, Navrangpura', pincode: '380009', upvoteCount: 123, daysAgo: 30 },
    { title: 'Sewage leak contaminating water in Vatva', category: 'water', priority: 'critical', status: 'pending', address: 'Vatva GIDC, Vatva', pincode: '382445', upvoteCount: 110, daysAgo: 5 },
  ],
  Rajkot: [
    { title: 'Road damaged near Gondal Highway for months', category: 'roads', priority: 'critical', status: 'pending', address: 'Gondal Highway, Rajkot', pincode: '360002', upvoteCount: 389, daysAgo: 25 },
    { title: 'Water shortage in Mavdi area 4 days', category: 'water', priority: 'critical', status: 'in-progress', address: 'Mavdi Plot, Rajkot', pincode: '360004', upvoteCount: 301, daysAgo: 4, governmentNote: 'Tanker service started.' },
    { title: 'Streetlights broken on 150 Feet Ring Road', category: 'streetlights', priority: 'high', status: 'pending', address: '150 Ft Ring Road, Rajkot', pincode: '360005', upvoteCount: 265, daysAgo: 45 },
    { title: 'Flooding at Aji River underpass in rain', category: 'drainage', priority: 'high', status: 'pending', address: 'Aji River Bridge, Rajkot', pincode: '360001', upvoteCount: 231, daysAgo: 15 },
    { title: 'Garbage collection stopped in Kalawad Road', category: 'garbage', priority: 'high', status: 'in-progress', address: 'Kalawad Road, Rajkot', pincode: '360001', upvoteCount: 205, daysAgo: 14 },
    { title: 'Power outages in Yagnik Road area', category: 'electricity', priority: 'high', status: 'pending', address: 'Yagnik Road, Rajkot', pincode: '360001', upvoteCount: 187, daysAgo: 9 },
    { title: 'Rash driving near race course – no traffic control', category: 'traffic', priority: 'high', status: 'pending', address: 'Race Course, Rajkot', pincode: '360001', upvoteCount: 155, daysAgo: 12 },
    { title: 'Broken footpath near Sadar Bazar', category: 'sanitation', priority: 'medium', status: 'pending', address: 'Sadar Bazar, Rajkot', pincode: '360001', upvoteCount: 132, daysAgo: 20 },
    { title: 'Pratap Vilas Garden needs maintenance', category: 'parks', priority: 'medium', status: 'in-progress', address: 'Pratap Vilas Garden, Rajkot', pincode: '360001', upvoteCount: 118, daysAgo: 35 },
    { title: 'Contaminated water in Raiya area', category: 'water', priority: 'critical', status: 'pending', address: 'Raiya Road, Rajkot', pincode: '360007', upvoteCount: 101, daysAgo: 7 },
  ],
  Surat: [
    { title: 'Huge potholes on Udhna-Magdalla Road', category: 'roads', priority: 'critical', status: 'in-progress', address: 'Udhna-Magdalla Road, Surat', pincode: '394210', upvoteCount: 445, daysAgo: 12, governmentNote: 'Patching work started.' },
    { title: 'No water in Adajan for 5 days', category: 'water', priority: 'critical', status: 'pending', address: 'Adajan Patia, Surat', pincode: '395009', upvoteCount: 367, daysAgo: 5 },
    { title: 'Street lights off on Bhatar Road', category: 'streetlights', priority: 'high', status: 'completed', address: 'Bhatar Road, Surat', pincode: '395017', upvoteCount: 289, daysAgo: 55, proof: { description: 'LED lights fitted on Bhatar Rd', uploadedAt: new Date(Date.now() - 86400000) }, resolvedAt: new Date(Date.now() - 86400000) },
    { title: 'Tapi River drainage causing Vesu flooding', category: 'drainage', priority: 'high', status: 'in-progress', address: 'Vesu, Surat', pincode: '395007', upvoteCount: 245, daysAgo: 20 },
    { title: 'Textile market waste not cleared for weeks', category: 'garbage', priority: 'high', status: 'pending', address: 'Textile Market, Ring Road, Surat', pincode: '395002', upvoteCount: 218, daysAgo: 16 },
    { title: 'Electricity cuts in Katargam GIDC', category: 'electricity', priority: 'high', status: 'pending', address: 'Katargam GIDC, Surat', pincode: '395004', upvoteCount: 196, daysAgo: 8 },
    { title: 'No traffic signals at Dindoli Crossing', category: 'traffic', priority: 'critical', status: 'pending', address: 'Dindoli, Surat', pincode: '394210', upvoteCount: 172, daysAgo: 5 },
    { title: 'Open drain near Majura Gate hospital', category: 'sanitation', priority: 'critical', status: 'pending', address: 'Majura Gate, Surat', pincode: '395001', upvoteCount: 154, daysAgo: 6 },
    { title: 'Sarthana Nature Park flooded', category: 'parks', priority: 'medium', status: 'in-progress', address: 'Sarthana Park, Surat', pincode: '395006', upvoteCount: 131, daysAgo: 28 },
    { title: 'Brown water from taps in Piplod', category: 'water', priority: 'critical', status: 'pending', address: 'Piplod, Surat', pincode: '395007', upvoteCount: 115, daysAgo: 4 },
  ],
  Vadodara: [
    { title: 'Deep pothole on Alkapuri Circle causing accidents', category: 'roads', priority: 'critical', status: 'in-progress', address: 'Alkapuri Circle, Sayajigunj', pincode: '390007', upvoteCount: 342, daysAgo: 15, governmentNote: 'Work order issued. Repair crew deployed.' },
    { title: 'No water supply for 5 days in Fatehgunj', category: 'water', priority: 'critical', status: 'pending', address: 'Fatehgunj Society, Near Railway', pincode: '390002', upvoteCount: 289, daysAgo: 5 },
    { title: 'Street lights off on Productivity Road 3 months', category: 'streetlights', priority: 'high', status: 'completed', address: 'Productivity Road, Vadodara', pincode: '390020', upvoteCount: 267, daysAgo: 90, governmentNote: 'All faulty lights replaced with LED.', proof: { description: '42 LED street lights replaced.', uploadedAt: new Date(Date.now() - 2 * 86400000) }, resolvedAt: new Date(Date.now() - 2 * 86400000) },
    { title: 'Overflowing drainage near Sayaji Garden', category: 'drainage', priority: 'high', status: 'in-progress', address: 'Sayaji Garden Road', pincode: '390005', upvoteCount: 231, daysAgo: 20 },
    { title: 'Garbage not collected in Vasna for 2 weeks', category: 'garbage', priority: 'high', status: 'pending', address: 'Vasna Bhayli Road', pincode: '390015', upvoteCount: 198, daysAgo: 14 },
    { title: 'Power cuts 8+ hours daily in Makarpura', category: 'electricity', priority: 'high', status: 'in-progress', address: 'Makarpura GIDC Area', pincode: '390010', upvoteCount: 187, daysAgo: 8 },
    { title: 'Dangerous traffic at Harni Crossing — no signal', category: 'traffic', priority: 'high', status: 'pending', address: 'Harni Road Crossing, Vadodara', pincode: '390022', upvoteCount: 173, daysAgo: 11 },
    { title: 'Manhole cover missing on Jetalpur Road', category: 'sanitation', priority: 'critical', status: 'completed', address: 'Jetalpur Road, near Panigate', pincode: '390017', upvoteCount: 176, daysAgo: 10, proof: { description: 'New heavy-duty manhole cover installed', uploadedAt: new Date(Date.now() - 86400000) }, resolvedAt: new Date(Date.now() - 86400000) },
    { title: 'Park benches broken in Harni Lake Garden', category: 'parks', priority: 'medium', status: 'in-progress', address: 'Harni Lake Garden, Harni', pincode: '390022', upvoteCount: 134, daysAgo: 30, governmentNote: 'Renovation started.' },
    { title: 'Sewage mixing with water in Gorwa', category: 'water', priority: 'critical', status: 'pending', address: 'Gorwa Housing Society', pincode: '390016', upvoteCount: 121, daysAgo: 3 },
  ],
  Anand: [
    { title: 'NH-48 potholes near Anand bypass causing accidents', category: 'roads', priority: 'critical', status: 'pending', address: 'NH-48 Bypass, Anand', pincode: '388001', upvoteCount: 312, daysAgo: 18 },
    { title: 'Water scarcity in Vallabh Vidyanagar for 4 days', category: 'water', priority: 'critical', status: 'in-progress', address: 'Vallabh Vidyanagar, Anand', pincode: '388120', upvoteCount: 278, daysAgo: 4, governmentNote: 'Emergency tanker supply started.' },
    { title: 'No streetlights on Station Road, Anand', category: 'streetlights', priority: 'high', status: 'pending', address: 'Station Road, Anand', pincode: '388001', upvoteCount: 241, daysAgo: 35 },
    { title: 'Flooding in low-lying areas near Anand town', category: 'drainage', priority: 'high', status: 'pending', address: 'Old Town, Anand', pincode: '388001', upvoteCount: 198, daysAgo: 12 },
    { title: 'Waste accumulation near AMUL dairy road', category: 'garbage', priority: 'high', status: 'in-progress', address: 'AMUL Dairy Road, Anand', pincode: '388001', upvoteCount: 167, daysAgo: 10 },
    { title: 'Frequent power cuts in Karamsad village', category: 'electricity', priority: 'high', status: 'pending', address: 'Karamsad, Anand', pincode: '388325', upvoteCount: 156, daysAgo: 7 },
    { title: 'No traffic management at Anand–Vidyanagar junction', category: 'traffic', priority: 'high', status: 'pending', address: 'Anand-Vidyanagar Junction', pincode: '388001', upvoteCount: 143, daysAgo: 14 },
    { title: 'Open sewer near primary school in Anand', category: 'sanitation', priority: 'critical', status: 'pending', address: 'Town Hall Road, Anand', pincode: '388001', upvoteCount: 132, daysAgo: 8 },
    { title: 'Sardar Patel Garden toilets locked & broken', category: 'parks', priority: 'medium', status: 'pending', address: 'SP Garden, Anand', pincode: '388001', upvoteCount: 118, daysAgo: 40 },
    { title: 'Contaminated water in Borsad area', category: 'water', priority: 'critical', status: 'pending', address: 'Borsad Town, Anand', pincode: '388540', upvoteCount: 108, daysAgo: 6 },
  ]
};

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await User.deleteMany({});
    await Issue.deleteMany({});
    console.log('🗑️  Cleared existing data');

    const hashedPw = await bcrypt.hash('demo123', 12);
    const allUsers = [];
    const credentials = [];

    for (const city of VALID_CITIES) {
      const citySlug = city.toLowerCase();

      // District Magistrate
      const dm = await User.create({
        name: `DM ${city}`,
        email: `dm.${citySlug}@gujarat.gov.in`,
        password: hashedPw,
        role: 'district_magistrate',
        city
      });

      credentials.push({ role: 'District Magistrate', city, email: dm.email, password: 'demo123' });

      // Department Heads
      for (const dept of DEPARTMENTS) {
        const dh = await User.create({
          name: `${dept.charAt(0).toUpperCase() + dept.slice(1)} Head – ${city}`,
          email: `${dept}.${citySlug}@gujarat.gov.in`,
          password: hashedPw,
          role: 'department_head',
          city,
          department: dept
        });
        credentials.push({ role: `Dept Head (${dept})`, city, email: dh.email, password: 'demo123' });
      }

      // Citizens
      const cityUsers = [];
      const citizenNames = ['Rahul Sharma', 'Priya Patel', 'Amit Desai', 'Sunita Mehta', 'Kiran Joshi'];
      for (let i = 0; i < 5; i++) {
        const u = await User.create({
          name: citizenNames[i],
          email: `citizen${i + 1}.${citySlug}@example.com`,
          password: hashedPw,
          role: 'citizen',
          city
        });
        cityUsers.push(u);
      }

      // Demo citizen per city
      const demoCitizen = await User.create({
        name: `Demo Citizen ${city}`,
        email: `demo.${citySlug}@citizen.com`,
        password: hashedPw,
        role: 'citizen',
        city
      });
      cityUsers.push(demoCitizen);
      credentials.push({ role: 'Citizen', city, email: demoCitizen.email, password: 'demo123' });

      allUsers.push(...cityUsers);

      // Create issues for this city
      const issues = cityIssues[city];
      for (const issueData of issues) {
        const { daysAgo, proof, upvoteCount, address, pincode, ...rest } = issueData;
        const author = cityUsers[Math.floor(Math.random() * cityUsers.length)];
        const createdAt = new Date(Date.now() - daysAgo * 86400000);
        const upvoterCount = Math.min(upvoteCount, cityUsers.length);
        const upvotes = cityUsers.slice(0, upvoterCount).map(c => c._id);

        await Issue.create({
          ...rest,
          location: { address, city, pincode },
          author: author._id,
          authorName: author.name,
          upvotes,
          upvoteCount,
          createdAt,
          updatedAt: createdAt,
          ...(proof ? { proof: { ...proof, uploadedBy: dm._id } } : {}),
          comments: [
            { user: cityUsers[0]._id, userName: cityUsers[0].name, text: 'This has been a problem for months! Urgent fix needed.', createdAt: new Date(createdAt.getTime() + 3600000) },
            { user: cityUsers[1]._id, userName: cityUsers[1].name, text: 'Agreed! My family is also affected.', createdAt: new Date(createdAt.getTime() + 7200000) },
          ]
        });
      }

      console.log(`✅ ${city}: 1 DM + ${DEPARTMENTS.length} dept heads + ${cityUsers.length} citizens + ${issues.length} issues`);
    }

    console.log('\n🎉 Seeding complete!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('DEMO CREDENTIALS (all passwords: demo123)');
    console.log('═══════════════════════════════════════════════════════════');
    const grouped = {};
    for (const c of credentials) {
      if (!grouped[c.city]) grouped[c.city] = [];
      grouped[c.city].push(c);
    }
    for (const city of VALID_CITIES) {
      console.log(`\n📍 ${city.toUpperCase()}`);
      for (const c of grouped[city]) {
        console.log(`  [${c.role.padEnd(25)}] ${c.email}`);
      }
    }
    console.log('\n');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
