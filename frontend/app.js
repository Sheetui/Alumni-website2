// College Alumni Page - Main Application Script

const API_BASE = window.ALIMIN_API_BASE || 'https://backend-coral-iota-64.vercel.app';

async function apiFetch(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const method = options.method || 'GET';
    const token = options.token || null;
    const body = options.body ?? null;

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body !== null) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : undefined
    });

    const text = await res.text();
    let data = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { message: text };
        }
    }

    if (!res.ok) {
        const msg = data.detail || data.message || data.error || `Request failed (${res.status})`;
        throw new Error(msg);
    }
    return data;
}

// Auth module
const auth = {
    SESSION_KEY: 'alumni_session',

    TOKEN_KEY: 'alumni_access_token',

    getToken() {
        return sessionStorage.getItem(this.TOKEN_KEY);
    },

    async login(email, password) {
        const emailNormalized = (email || '').trim().toLowerCase();
        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: { email: emailNormalized, password }
            });
            sessionStorage.setItem(this.TOKEN_KEY, data.access_token);
            sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(data.user));
            return { ok: true, user: data.user };
        } catch (e) {
            return { ok: false, msg: e.message || 'Invalid email or password.' };
        }
    },

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        sessionStorage.removeItem(this.TOKEN_KEY);
    },

    getCurrentUser() {
        const s = sessionStorage.getItem(this.SESSION_KEY);
        return s ? JSON.parse(s) : null;
    },

    isAlumni() {
        const u = this.getCurrentUser();
        return u && u.role === 'alumni';
    },

    isAdmin() {
        const u = this.getCurrentUser();
        return u && u.role === 'admin';
    }
};

// Modal handling
function setupModals() {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const feedbackModal = document.getElementById('feedbackModal');

    const openLogin = () => {
        registerModal?.classList.remove('active');
        loginModal?.classList.add('active');
    };
    const openRegister = () => {
        loginModal?.classList.remove('active');
        feedbackModal?.classList.remove('active');
        registerModal?.classList.add('active');
    };

    document.querySelectorAll('#openLogin, #heroLogin').forEach(el => el?.addEventListener('click', openLogin));
    document.querySelectorAll('#openRegister, #heroRegister').forEach(el => el?.addEventListener('click', openRegister));

    // Home page feature cards -> routed flows
    document.getElementById('featureProfile')?.addEventListener('click', () => {
        const current = auth.getCurrentUser();
        if (current?.role === 'admin') {
            window.location.href = 'admin.html';
            return;
        }
        if (current?.role === 'alumni') {
            window.location.href = 'dashboard.html';
            return;
        }
        openLogin();
    });

    document.getElementById('featureEvents')?.addEventListener('click', () => {
        const current = auth.getCurrentUser();
        if (current?.role === 'admin') {
            window.location.href = 'admin.html#addEvent';
            return;
        }
        if (current?.role === 'alumni') {
            window.location.href = 'dashboard.html#events';
            return;
        }
        openLogin();
    });

    document.getElementById('featureJobs')?.addEventListener('click', () => {
        const current = auth.getCurrentUser();
        if (current?.role === 'admin') {
            window.location.href = 'admin.html#addJob';
            return;
        }
        if (current?.role === 'alumni') {
            window.location.href = 'dashboard.html#jobs';
            return;
        }
        openLogin();
    });

    document.getElementById('featureNetworking')?.addEventListener('click', () => {
        const current = auth.getCurrentUser();
        if (current?.role !== 'alumni') {
            const errEl = document.getElementById('loginError');
            if (errEl) errEl.textContent = 'Please login as alumni to submit feedback.';
            openLogin();
            return;
        }
        loginModal?.classList.remove('active');
        registerModal?.classList.remove('active');
        feedbackModal?.classList.add('active');

        const fbName = document.getElementById('fbName');
        const fbEmail = document.getElementById('fbEmail');
        if (fbName) fbName.value = current.name || '';
        if (fbEmail) fbEmail.value = current.email || '';
    });

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal')?.classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) e.target.classList.remove('active');
    });
}

function setupFeedbackForm() {
    const form = document.getElementById('feedbackForm');
    if (!form) return;

    const statusSelect = document.getElementById('fbStatus');
    const serviceFields = document.getElementById('fbServiceFields');
    const higherFields = document.getElementById('fbHigherFields');
    const designationEl = document.getElementById('fbDesignation');
    const organizationEl = document.getElementById('fbOrganization');
    const programEl = document.getElementById('fbProgram');
    const institutionEl = document.getElementById('fbInstitution');

    const applyStatusFields = () => {
        const isHigher = statusSelect?.value === 'higher';
        serviceFields?.classList.toggle('active', !isHigher);
        higherFields?.classList.toggle('active', isHigher);
        if (designationEl) designationEl.required = !isHigher;
        if (organizationEl) organizationEl.required = !isHigher;
        if (programEl) programEl.required = isHigher;
        if (institutionEl) institutionEl.required = isHigher;
    };

    statusSelect?.addEventListener('change', applyStatusFields);
    applyStatusFields();

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const current = auth.getCurrentUser();
        const errEl = document.getElementById('feedbackError');
        const successEl = document.getElementById('feedbackSuccess');
        if (errEl) errEl.textContent = '';
        if (successEl) successEl.textContent = '';

        if (!current || current.role !== 'alumni') {
            if (errEl) errEl.textContent = 'Please login as alumni to submit feedback.';
            return;
        }

        const rating = {};
        for (let i = 1; i <= 10; i++) {
            const selected = form.querySelector(`input[name="q${i}"]:checked`);
            if (!selected) {
                if (errEl) errEl.textContent = 'Please rate all areas before submitting.';
                return;
            }
            rating[`q${i}`] = Number(selected.value);
        }

        try {
            await apiFetch('/feedback', {
                method: 'POST',
                token: auth.getToken(),
                body: {
                    name: document.getElementById('fbName').value.trim(),
                    email: document.getElementById('fbEmail').value.trim().toLowerCase(),
                    alumni_id: current.id,
                    academic_year: document.getElementById('fbAcademicYear').value.trim(),
                    present_address: document.getElementById('fbAddress').value.trim(),
                    status: statusSelect?.value || 'service',
                    designation: designationEl?.value.trim() || '',
                    organization: organizationEl?.value.trim() || '',
                    program: programEl?.value.trim() || '',
                    institution: institutionEl?.value.trim() || '',
                    q1: rating.q1,
                    q2: rating.q2,
                    q3: rating.q3,
                    q4: rating.q4,
                    q5: rating.q5,
                    q6: rating.q6,
                    q7: rating.q7,
                    q8: rating.q8,
                    q9: rating.q9,
                    q10: rating.q10
                }
            });

            if (successEl) successEl.textContent = 'Feedback submitted successfully. Thank you!';
            form.reset();
            applyStatusFields();
        } catch (e) {
            if (errEl) errEl.textContent = e.message || 'Failed to submit feedback.';
        }
    });
}

// Login form
function setupLoginForm() {
    document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errEl = document.getElementById('loginError');
        errEl.textContent = '';

        const result = await auth.login(email, password);
        if (result.ok) {
            document.getElementById('loginModal')?.classList.remove('active');
            if (result.user.role === 'admin') window.location.href = 'admin.html';
            else window.location.href = 'dashboard.html';
        } else {
            errEl.textContent = result.msg;
        }
    });

    const forgotLink = document.getElementById('forgotPasswordLink');
    const forgotSection = document.getElementById('forgotPasswordSection');
    const forgotSubmit = document.getElementById('forgotSubmit');

    forgotLink?.addEventListener('click', () => {
        forgotSection?.classList.toggle('active');
    });

    forgotSubmit?.addEventListener('click', async () => {
        const email = document.getElementById('fpEmail').value.trim();
        const newPassword = document.getElementById('fpNewPassword').value;
        const confirmPassword = document.getElementById('fpConfirmPassword').value;
        const errEl = document.getElementById('forgotError');
        const successEl = document.getElementById('forgotSuccess');
        errEl.textContent = '';
        successEl.textContent = '';

        if (!email) {
            errEl.textContent = 'Please enter your registered email.';
            return;
        }
        if (newPassword.length < 6) {
            errEl.textContent = 'New password must be at least 6 characters.';
            return;
        }
        if (newPassword !== confirmPassword) {
            errEl.textContent = 'New password and confirm password do not match.';
            return;
        }

        try {
            await apiFetch('/auth/reset-password', {
                method: 'POST',
                body: {
                    email: email.toLowerCase(),
                    new_password: newPassword,
                    confirm_password: confirmPassword
                }
            });
            successEl.textContent = 'Password updated successfully. You can now log in with your new password.';
        } catch (e) {
            errEl.textContent = e.message || 'Failed to update password.';
        }
    });
}

// Register form
/*function setupRegisterForm() {
    document.getElementById('registerForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const emailNormalized = email.toLowerCase();
        const batch = document.getElementById('regBatch').value.trim();
        const course = document.getElementById('regCourse').value.trim();
        const companyType = document.getElementById('regCompanyType').value;
        const companyName = document.getElementById('regCompanyName').value.trim();
        const higherStudiesName = document.getElementById('regHigherStudiesName').value.trim();
        const company = companyType === 'higher' ? higherStudiesName : companyName;
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirmPassword').value;
        const errEl = document.getElementById('registerError');
        const successEl = document.getElementById('registerSuccess');
        errEl.textContent = '';
        successEl.textContent = '';

        if (password !== confirm) {
            errEl.textContent = 'Passwords do not match.';
            return;
        }
        if (password.length < 6) {
            errEl.textContent = 'Password must be at least 6 characters.';
            return;
        }

        const users = getData(DATA_KEYS.USERS);
        const pending = getData(DATA_KEYS.PENDING);
        if (
            users.some(u => (u.email || '').toLowerCase() === emailNormalized) ||
            pending.some(p => (p.email || '').toLowerCase() === emailNormalized)
        ) {
            errEl.textContent = 'This email is already registered.';
            return;
        }

        const newAlumni = {
            id: Date.now().toString(),
            email: emailNormalized,
            password,
            name,
            batch,
            course,
            company: company || '',
            role_position: '',
            bio: '',
            gender: '',
            mobile: '',
            experience: '',
            skills: '',
            achievements: '',
            profile_picture: '',
            role: 'alumni',
            approved: false
        };
        pending.push(newAlumni);
        setData(DATA_KEYS.PENDING, pending);
        successEl.textContent = 'Registration successful! Awaiting admin approval. You can now proceed to the login page.';
        this.reset();

        const registerModal = document.getElementById('registerModal');
        const loginModal = document.getElementById('loginModal');
        if (registerModal && loginModal) {
            registerModal.classList.remove('active');
            loginModal.classList.add('active');
            const loginEmailInput = document.getElementById('loginEmail');
            if (loginEmailInput) {
                loginEmailInput.value = email;
                loginEmailInput.focus();
            }
        }
    });
}*/
// Register form
function setupRegisterForm() {
    document.getElementById('registerForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const batch = document.getElementById('regBatch').value.trim();
        const course = document.getElementById('regCourse').value.trim();
        const companyType = document.getElementById('regCompanyType').value;
        const companyName = document.getElementById('regCompanyName').value.trim();
        const higherStudiesName = document.getElementById('regHigherStudiesName').value.trim();
        const company = companyType === 'higher' ? higherStudiesName : companyName;
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirmPassword').value;
        const errEl = document.getElementById('registerError');
        const successEl = document.getElementById('registerSuccess');
        errEl.textContent = '';
        successEl.textContent = '';

        if (password !== confirm) {
            errEl.textContent = 'Passwords do not match.';
            return;
        }
        if (password.length < 6) {
            errEl.textContent = 'Password must be at least 6 characters.';
            return;
        }

        try {
            await apiFetch('/auth/register', {
                method: 'POST',
                body: {
                    email: email.toLowerCase(),
                    password,
                    name,
                    batch,
                    course,
                    company_type: companyType,
                    company: company || ''
                }
            });

            // Show message, then switch to Login
            successEl.textContent = 'Registration successful! Awaiting admin approval. Please log in once approved.';
            this.reset();

            const registerModal = document.getElementById('registerModal');
            const loginModal = document.getElementById('loginModal');
            if (registerModal && loginModal) {
                registerModal.classList.remove('active');  // hide Register
                loginModal.classList.add('active');        // show Login

                const loginEmailInput = document.getElementById('loginEmail');
                if (loginEmailInput) {
                    loginEmailInput.value = email;         // prefill email
                    loginEmailInput.focus();
                }
            }
        } catch (e) {
            errEl.textContent = e.message || 'Registration failed.';
        }
    });

    // Toggle company vs higher studies inputs
    const regCompanyType = document.getElementById('regCompanyType');
    const regCompanySection = document.getElementById('regCompanySection');
    const regHigherStudiesSection = document.getElementById('regHigherStudiesSection');
    if (regCompanyType && regCompanySection && regHigherStudiesSection) {
        const applyToggle = () => {
            const isHigher = regCompanyType.value === 'higher';
            regCompanySection.classList.toggle('active', !isHigher);
            regHigherStudiesSection.classList.toggle('active', isHigher);
        };
        regCompanyType.addEventListener('change', applyToggle);
        applyToggle();
    }
}

// Tab switching
function setActiveTab(tabId) {
    if (!tabId) return;
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const section = document.getElementById(tabId);
    if (!btn || !section) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    section.classList.add('active');
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveTab(btn.dataset.tab);
        });
    });
}

// Dashboard functions
async function loadDashboard() {
    let user = auth.getCurrentUser();
    try {
        const me = await apiFetch('/me', { token: auth.getToken() });
        sessionStorage.setItem(auth.SESSION_KEY, JSON.stringify(me));
        user = me;
    } catch (e) {
        // If the token is invalid/expired, the guard script on page load should redirect.
    }

    document.getElementById('userGreeting').textContent = `Welcome, ${user?.name || 'Alumni'}!`;

    // Profile
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.querySelector('#profileName').value = user?.name || '';
        profileForm.querySelector('#profileEmail').value = user?.email || '';
        profileForm.querySelector('#profileMobile').value = user?.mobile || '';
        profileForm.querySelector('#profileGender').value = user?.gender || '';
        profileForm.querySelector('#profilePassingYear').value = user?.batch || '';
        profileForm.querySelector('#profileCourse').value = user?.course || '';
        const companyType = user?.company_type || 'company';
        const companyValue = user?.company || '';
        profileForm.querySelector('#profileCompanyType').value = companyType === 'higher' ? 'higher' : 'company';
        profileForm.querySelector('#profileCompanyName').value = companyType === 'higher' ? '' : companyValue;
        profileForm.querySelector('#profileHigherStudiesName').value = companyType === 'higher' ? companyValue : '';
        profileForm.querySelector('#profileExperience').value = user?.experience || '';
        profileForm.querySelector('#profilePicture').value = user?.profile_picture || '';
        profileForm.querySelector('#profileSkills').value = user?.skills || '';
        profileForm.querySelector('#profileAchievements').value = user?.achievements || '';

        // Show correct input based on company type
        const companyTypeSelect = profileForm.querySelector('#profileCompanyType');
        const companySection = document.getElementById('profileCompanySection');
        const higherStudiesSection = document.getElementById('profileHigherStudiesSection');
        const applyCompanyToggle = () => {
            const isHigher = companyTypeSelect.value === 'higher';
            companySection?.classList.toggle('active', !isHigher);
            higherStudiesSection?.classList.toggle('active', isHigher);
        };
        companyTypeSelect?.addEventListener('change', applyCompanyToggle);
        applyCompanyToggle();

        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const companyTypeValue = profileForm.querySelector('#profileCompanyType').value;
            const companyValueUpdated = companyTypeValue === 'higher'
                ? profileForm.querySelector('#profileHigherStudiesName').value.trim()
                : profileForm.querySelector('#profileCompanyName').value.trim();

            const payload = {
                name: profileForm.querySelector('#profileName').value.trim(),
                email: profileForm.querySelector('#profileEmail').value.trim(),
                mobile: profileForm.querySelector('#profileMobile').value.trim(),
                gender: profileForm.querySelector('#profileGender').value,
                batch: profileForm.querySelector('#profilePassingYear').value.trim(),
                course: profileForm.querySelector('#profileCourse').value.trim(),
                company_type: companyTypeValue,
                company: companyValueUpdated,
                experience: profileForm.querySelector('#profileExperience').value.trim(),
                profile_picture: profileForm.querySelector('#profilePicture').value.trim(),
                skills: profileForm.querySelector('#profileSkills').value.trim(),
                achievements: profileForm.querySelector('#profileAchievements').value.trim()
            };

            try {
                const updated = await apiFetch('/me/profile', {
                    method: 'PUT',
                    token: auth.getToken(),
                    body: payload
                });
                sessionStorage.setItem(auth.SESSION_KEY, JSON.stringify(updated));
                alert('Profile updated successfully!');
            } catch (e2) {
                alert(e2.message || 'Failed to update profile.');
            }
        });
    }

    // Directory
    renderAlumniDirectory();
    document.getElementById('directorySearch')?.addEventListener('input', renderAlumniDirectory);

    // Events
    renderEvents();

    // Jobs
    renderJobs();

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        auth.logout();
        window.location.href = 'index.html';
    });

    setupTabs();
    const hash = window.location.hash.replace('#', '');
    if (hash) setActiveTab(hash);
}

async function renderAlumniDirectory() {
    const container = document.getElementById('alumniList');
    if (!container) return;

    const search = (document.getElementById('directorySearch')?.value || '').trim();
    container.innerHTML = '<div class="card">Loading...</div>';

    let users = [];
    try {
        const qs = search ? `?search=${encodeURIComponent(search)}` : '';
        users = await apiFetch(`/alumni${qs}`);
    } catch (e) {
        container.innerHTML = '<div class="card">Failed to load alumni directory.</div>';
        return;
    }

    container.innerHTML = users
        .filter(u => u.role === 'alumni' && u.approved !== false)
        .map(u => `
        <div class="card">
            <h4>${u.name || 'Alumni'}</h4>
            <p><strong>Batch:</strong> ${u.batch || '-'}</p>
            <p><strong>Course:</strong> ${u.course || '-'}</p>
            <p><strong>${u.company_type === 'higher' ? 'College / University' : 'Current Company'}:</strong> ${u.company || '-'}</p>
        </div>
    `).join('');
}

async function renderEvents() {
    const container = document.getElementById('eventsList');
    if (!container) return;
    container.innerHTML = '<div class="card">Loading...</div>';

    let events = [];
    try {
        events = await apiFetch('/events');
    } catch (e) {
        container.innerHTML = '<div class="card">Failed to load events.</div>';
        return;
    }

    container.innerHTML = events.map(e => `
        <div class="card">
            <h4>${e.title}</h4>
            <p><small>${e.date} • ${e.type}</small></p>
            <p>${e.desc}</p>
        </div>
    `).join('');
}

async function renderJobs() {
    const container = document.getElementById('jobsList');
    if (!container) return;
    container.innerHTML = '<div class="card">Loading...</div>';

    let jobs = [];
    try {
        jobs = await apiFetch('/jobs');
    } catch (e) {
        container.innerHTML = '<div class="card">Failed to load jobs.</div>';
        return;
    }

    container.innerHTML = jobs.map(j => `
        <div class="card">
            <h4>${j.title}</h4>
            <p><strong>${j.company}</strong> • ${j.type}</p>
            <p>${j.desc}</p>
            ${j.contact ? `<p><a href="mailto:${j.contact}" style="color:var(--accent)">Apply: ${j.contact}</a></p>` : ''}
        </div>
    `).join('');
}

// Admin panel
function loadAdminPanel() {
    renderPending();
    renderAdminAlumni();
    renderFeedback();
    document.getElementById('adminNavSearch')?.addEventListener('input', () => {
        renderPending();
        renderAdminAlumni();
    });

    document.getElementById('eventForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            await apiFetch('/admin/events', {
                method: 'POST',
                token: auth.getToken(),
                body: {
                    title: document.getElementById('eventTitle').value.trim(),
                    desc: document.getElementById('eventDesc').value.trim(),
                    date: document.getElementById('eventDate').value || new Date().toISOString().slice(0, 10),
                    type: document.getElementById('eventType').value
                }
            });
            this.reset();
            alert('Event/Notice published!');
        } catch (e) {
            alert(e.message || 'Failed to publish event.');
        }
    });

    document.getElementById('jobForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            await apiFetch('/admin/jobs', {
                method: 'POST',
                token: auth.getToken(),
                body: {
                    title: document.getElementById('jobTitle').value.trim(),
                    company: document.getElementById('jobCompany').value.trim(),
                    desc: document.getElementById('jobDesc').value.trim(),
                    type: document.getElementById('jobType').value,
                    contact: document.getElementById('jobContact').value.trim()
                }
            });
            this.reset();
            alert('Job/Internship posted!');
        } catch (e) {
            alert(e.message || 'Failed to post job.');
        }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        auth.logout();
        window.location.href = 'index.html';
    });

    setupTabs();
    const hash = window.location.hash.replace('#', '');
    if (hash) setActiveTab(hash);
}

async function renderPending() {
    const container = document.getElementById('pendingList');
    if (!container) return;

    const search = (document.getElementById('adminNavSearch')?.value || '').toLowerCase();
    container.innerHTML = '<div class="card">Loading...</div>';

    let pending = [];
    try {
        const qs = search ? `?search=${encodeURIComponent(search)}` : '';
        pending = await apiFetch(`/admin/pending${qs}`, { token: auth.getToken() });
    } catch (e) {
        container.innerHTML = '<div class="card">Failed to load pending registrations.</div>';
        return;
    }

    if (!pending || pending.length === 0) {
        container.innerHTML = '<div class="card">No pending registrations found.</div>';
        return;
    }

    container.innerHTML = pending.map(p => `
        <div class="card">
            <h4>${p.name}</h4>
            <p>
                ${p.email} | Batch: ${p.batch || '-'}
                | ${p.company_type === 'higher' ? 'College / University' : 'Current Company'}: ${p.company || '-'}
            </p>
            <div>
                <button class="btn btn-primary approve-btn" data-id="${p.id}">Approve</button>
                <button class="btn btn-outline reject-btn" data-id="${p.id}">Reject</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', () => approveAlumni(btn.dataset.id));
    });
    container.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', () => rejectAlumni(btn.dataset.id));
    });
}

async function approveAlumni(id) {
    try {
        await apiFetch(`/admin/pending/${id}/approve`, {
            method: 'POST',
            token: auth.getToken()
        });
        renderPending();
        renderAdminAlumni();
    } catch (e) {
        alert(e.message || 'Failed to approve alumni.');
    }
}

async function rejectAlumni(id) {
    try {
        await apiFetch(`/admin/pending/${id}/reject`, {
            method: 'POST',
            token: auth.getToken()
        });
        renderPending();
        renderAdminAlumni();
    } catch (e) {
        alert(e.message || 'Failed to reject alumni.');
    }
}

async function renderAdminAlumni() {
    const search = (document.getElementById('adminNavSearch')?.value || '').toLowerCase();
    const container = document.getElementById('adminAlumniList');
    if (!container) return;

    container.innerHTML = '<div class="card">Loading...</div>';

    let users = [];
    try {
        const qs = search ? `?search=${encodeURIComponent(search)}` : '';
        users = await apiFetch(`/admin/alumni${qs}`, { token: auth.getToken() });
    } catch (e) {
        container.innerHTML = '<div class="card">Failed to load alumni.</div>';
        return;
    }

    if (!users || users.length === 0) {
        container.innerHTML = '<div class="card">No alumni found.</div>';
        return;
    }

    container.innerHTML = users.map(u => `
        <div class="card">
            <h4>${u.name}</h4>
            <p>${u.email}</p>
            <p>
                Batch: ${u.batch || '-'}
                | ${u.company_type === 'higher' ? 'College / University' : 'Current Company'}: ${u.company || '-'}
            </p>
        </div>
    `).join('');
}

async function renderFeedback() {
    const container = document.getElementById('feedbackList');
    if (!container) return;
    
    container.innerHTML = '<div class="card">Loading feedback...</div>';

    let feedback = [];
    try {
        feedback = await apiFetch('/admin/feedback', { token: auth.getToken() });
    } catch (e) {
        container.innerHTML = '<div class="card">Failed to load feedback.</div>';
        return;
    }

    if (!feedback || feedback.length === 0) {
        container.innerHTML = '<div class="card">No feedback submitted yet.</div>';
        return;
    }

    container.innerHTML = feedback.map(fb => `
        <div class="card">
            <h4>Feedback ID: ${fb.id}</h4>
            <p><small>Submitted: ${new Date(fb.submitted_at).toLocaleDateString()}</small></p>
            <p><strong>Alumni ID:</strong> ${fb.alumni_id}</p>
            <p><strong>Status:</strong> ${fb.status === 'service' ? 'In Service' : 'In Higher Study'}</p>
        </div>
    `).join('');
}

// Init - only run on index.html
if (document.getElementById('loginModal')) {
    setupModals();
    setupLoginForm();
    setupRegisterForm();
    setupFeedbackForm();
}
