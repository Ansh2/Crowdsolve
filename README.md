# 🏙️ CrowdSolve — Citizen Issue Reporting Platform

A full-stack web application for transparent, accountable civic governance.

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript   |
| Backend    | Node.js + Express.js              |
| Database   | MongoDB + Mongoose ODM            |
| Auth       | JWT (JSON Web Tokens) + bcryptjs  |
| File Upload| Multer                            |
| Charts     | Chart.js                         |

---

## 📁 Project Structure

```
crowdsolve/
├── server.js                  # Main Express server
├── seed.js                    # Database seeder (demo data)
├── .env.example               # Environment variable template
├── package.json
│
├── models/
│   ├── User.js                # User schema (citizen + government)
│   └── Issue.js               # Issue schema (upvotes, comments, proof)
│
├── middleware/
│   └── auth.js                # JWT auth + role guards
│
├── routes/
│   ├── auth.js                # POST /register, POST /login, GET /me
│   ├── issues.js              # CRUD + upvote + comment + proof upload
│   └── dashboard.js           # Government analytics API
│
├── uploads/                   # User-uploaded images stored here
│
└── public/
    ├── index.html             # Home — issue feed with filters
    ├── css/style.css          # Full design system (dark theme)
    ├── js/app.js              # Shared API client + utilities
    └── pages/
        ├── login.html
        ├── register.html
        ├── report.html        # Submit new issue
        ├── trending.html      # Trending issues by upvotes
        ├── top-issues.html    # TOP 10 ranked issues by city
        ├── issue-detail.html  # Full issue + comments + proof
        └── dashboard.html     # Government monitoring dashboard
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)

### Step 1 — Clone & Install
```bash
git clone <your-repo>
cd crowdsolve
npm install
```

### Step 2 — Configure Environment
```bash
cp .env.example .env
```
Edit `.env`:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/crowdsolve
JWT_SECRET=change_this_to_a_long_random_string
```

### Step 3 — Seed Demo Data (Optional but Recommended)
```bash
node seed.js
```
This creates 15 realistic Vadodara issues + demo accounts.

### Step 4 — Start Server
```bash
# Production
npm start

# Development (hot reload)
npm run dev
```

Visit: **http://localhost:3000**

---

## 👤 Demo Accounts

| Role            | Email             | Password |
|-----------------|-------------------|----------|
| Citizen         | demo@citizen.com  | demo123  |
| Gov Official    | demo@gov.com      | demo123  |

---

## 📱 Pages & Features

### For Citizens
| Page          | URL            | Feature                                    |
|---------------|----------------|--------------------------------------------|
| Home          | `/`            | Browse, filter, search all issues          |
| Report        | `/report`      | Submit new issue with photos               |
| Trending      | `/trending`    | Issues sorted by upvotes                   |
| Top 10        | `/top-issues`  | Ranked issues with status + proof          |
| Issue Detail  | `/issue/:id`   | Full detail, comments, upvote              |
| Login         | `/login`       | Sign in                                    |
| Register      | `/register`    | Create citizen or gov account              |

### For Government
| Page          | URL            | Feature                                    |
|---------------|----------------|--------------------------------------------|
| Dashboard     | `/dashboard`   | Stats, charts, all issues table            |
| Status Update | (modal)        | Change status, add gov note                |
| Upload Proof  | (modal)        | Upload resolution photos + description     |
| Analytics     | (dashboard)    | Category & status charts                   |
| Top Voted     | (dashboard)    | See most upvoted issues first              |

---

## 🔌 API Reference

### Auth
```
POST /api/auth/register    Body: { name, email, password, city, role }
POST /api/auth/login       Body: { email, password }
GET  /api/auth/me          Header: Authorization: Bearer <token>
```

### Issues
```
GET  /api/issues           Query: city, category, status, sort, search, page, limit
GET  /api/issues/top10     Query: city
GET  /api/issues/:id       Single issue
POST /api/issues           Multipart form (auth required)
PUT  /api/issues/:id/upvote        Toggle upvote (auth)
POST /api/issues/:id/comment       Add comment (auth)
PUT  /api/issues/:id/status        Update status (gov only)
PUT  /api/issues/:id/proof         Upload proof (gov only)
```

### Dashboard (Government only)
```
GET  /api/dashboard/stats      Overview stats + recent + top
GET  /api/dashboard/issues     Paginated issues with filters
```

---

## 🌟 Key Features

### Top 10 Issues Page (`/top-issues`)
- Ranked list of most-upvoted issues in your city
- Color-coded by status (Pending 🟡 / In Progress 🔵 / Completed 🟢)
- Progress bar showing resolution journey
- Resolution proof badge when available
- Completion date shown for resolved issues
- Government notes visible

### Government Dashboard (`/dashboard`)
- Summary stats: total, pending, in-progress, completed, resolution rate
- Progress bars for status distribution
- Doughnut chart: issues by category
- Bar chart: status distribution
- Issues management table with inline status update
- Upload proof of completion with photos + description

### Transparency Features
- Every issue shows author name, date, location
- Government notes visible to all citizens
- Proof photos with completion date are public
- Resolution rate displayed on dashboard

---

## 🔐 Security
- Passwords hashed with bcryptjs (salt rounds: 12)
- JWT tokens expire in 7 days
- Government routes protected by role middleware
- File upload limited to images, max 5MB per file
- CORS enabled

---

## 🗄️ MongoDB Schema

**Issue** has:
- `status`: `pending | in-progress | completed`
- `priority`: `low | medium | high | critical`
- `upvotes`: array of user IDs (prevents double voting)
- `comments`: embedded subdocuments
- `proof`: `{ images[], description, uploadedAt }` (set by gov)
- `governmentNote`: official message visible to citizens

---

## 🔮 Future Enhancements
- [ ] Email/SMS notifications on status changes
- [ ] Google Maps integration for location picking
- [ ] Issue analytics with trend graphs
- [ ] Mobile app (React Native)
- [ ] Multi-city government accounts
- [ ] Issue assignment to specific departments
- [ ] Public API for third-party integrations
- [ ] Progressive Web App (PWA) support
