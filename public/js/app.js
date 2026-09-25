// ── API HELPER ──
const API = {
  base: '/api',

  getToken() { return localStorage.getItem('cp_token'); },
  getUser() { return JSON.parse(localStorage.getItem('cp_user') || 'null'); },
  setAuth(token, user) {
    localStorage.setItem('cp_token', token);
    localStorage.setItem('cp_user', JSON.stringify(user));
  },
  clearAuth() {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_user');
  },
  isLoggedIn() { return !!this.getToken(); },
  isGov() { return this.getUser()?.role === 'government'; },

  async request(method, path, body = null, isFormData = false) {
    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(this.base + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  get: (path) => API.request('GET', path),
  post: (path, body, isForm) => API.request('POST', path, body, isForm),
  put: (path, body, isForm) => API.request('PUT', path, body, isForm),
};

// ── TOAST ──
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── NAV INIT ──
function initNav() {
  const user = API.getUser();
  const navAuth = document.getElementById('nav-auth');
  if (!navAuth) return;

  if (user) {
    navAuth.innerHTML = `
      <span style="font-size:0.85rem;color:var(--text-muted)">${user.name}</span>
      ${user.role === 'district_magistrate' || user.role === 'department_head' ? `<a href="/dashboard" class="btn btn-outline">📊 Dashboard</a>` : ''}
      <a href="/report" class="btn btn-primary">+ Report Issue</a>
      <button onclick="logout()" class="btn btn-ghost">Logout</button>
    `;
  } else {
    navAuth.innerHTML = `
      <a href="/login" class="btn btn-outline">Login</a>
      <a href="/register" class="btn btn-primary">Sign Up</a>
    `;
  }

  // Highlight active link
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(link => {
    if (link.href === window.location.href) link.classList.add('active');
  });
}

function logout() {
  API.clearAuth();
  window.location.href = '/';
}

// ── FORMATTING ──
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function categoryIcon(cat) {
  const icons = {
    roads: '🛣️', water: '💧', electricity: '⚡', sanitation: '🗑️',
    parks: '🌳', drainage: '🌊', streetlights: '💡', garbage: '♻️', other: '📌'
  };
  return icons[cat] || '📌';
}

function statusClass(status) {
  return status === 'pending' ? 'status-pending' : status === 'in-progress' ? 'status-in-progress' : 'status-completed';
}

function statusLabel(status) {
  return status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);
}

function priorityClass(priority) {
  return `priority-${priority}`;
}

// ── ISSUE CARD ──
function renderIssueCard(issue, showUpvote = true) {
  const user = API.getUser();
  // Support both user.id and user._id (MongoDB may return either)
  const userId = user && (user.id || user._id);
  const upvoted = userId && issue.upvotes && issue.upvotes.some(v => v.toString() === userId.toString());
  const imgHtml = issue.images && issue.images.length > 0
    ? `<img src="${issue.images[0]}" alt="" class="card-img" onerror="this.style.display='none'">`
    : '';

  return `
    <a href="/issue/${issue._id}" class="issue-card ${priorityClass(issue.priority)}">
      ${imgHtml}
      <div class="card-top">
        <span class="category-badge">${categoryIcon(issue.category)} ${issue.category}</span>
        <span class="status-badge ${statusClass(issue.status)}">${statusLabel(issue.status)}</span>
      </div>
      <div class="card-title">${escHtml(issue.title)}</div>
      <div class="card-desc">${escHtml(issue.description)}</div>
      <div class="card-location">📍 ${escHtml(issue.location?.address || '')} · ${escHtml(issue.location?.city || '')}</div>
      <div class="card-footer">
        <div class="card-meta">
          <span>💬 ${issue.comments?.length || 0}</span>
          <span>👤 ${escHtml(issue.authorName || 'Anonymous')}</span>
          <span>${timeAgo(issue.createdAt)}</span>
        </div>
        ${showUpvote ? `
        <button class="upvote-btn ${upvoted ? 'upvoted' : ''}" onclick="event.preventDefault(); upvoteIssue('${issue._id}', this)">
          ▲ <span class="upvote-count">${issue.upvoteCount || 0}</span>
        </button>` : `<span class="text-accent font-syne" style="font-weight:700">▲ ${issue.upvoteCount || 0}</span>`}
      </div>
    </a>
  `;
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ── UPVOTE ──
async function upvoteIssue(id, btn) {
  if (!API.isLoggedIn()) { showToast('Please login to upvote', 'error'); window.location.href = '/login'; return; }
  try {
    const data = await API.put(`/issues/${id}/upvote`);
    // Update only the count span, not the whole button
    const countEl = btn.querySelector('.upvote-count');
    if (countEl) countEl.textContent = data.upvoteCount;
    else btn.innerHTML = `\u25b2 <span class="upvote-count">${data.upvoteCount}</span>`;
    btn.classList.toggle('upvoted', data.upvoted);
    showToast(data.upvoted ? 'Upvoted!' : 'Upvote removed');
  } catch(e) { showToast(e.message, 'error'); }
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', initNav);

// ── UPLOAD FORM HELPER ──
API.uploadForm = (path, formData) => API.request('PUT', path, formData, true);

// Override isGov for new roles
API.isGov = function() {
  const role = this.getUser()?.role;
  return role === 'district_magistrate' || role === 'department_head';
};
API.isDM = function() { return this.getUser()?.role === 'district_magistrate'; };
API.isDH = function() { return this.getUser()?.role === 'department_head'; };
