// College Alumni Page - Main Application Script

// Auth module
const auth = {
    SESSION_KEY: 'alumni_session',

    login(email, password) {
        const emailNormalized = (email || '').trim().toLowerCase();
        const users = getData(DATA_KEYS.USERS);
        const user = users.find(u => 
            ((u.email || '').toLowerCase() === emailNormalized || u.id === emailNormalized) && u.password === password
        );
        if (user) {
            if (user.role === 'alumni' && !user.approved) {
                return { ok: false, msg: 'Your registration is pending admin approval.' };
            }
            sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
            return { ok: true, user };
        }
        return { ok: false, msg: 'Invalid email or password.' };
    },

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
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

    form.addEventListener('submit', function(e) {
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

        const feedbacks = getData(DATA_KEYS.FEEDBACKS);
        const rating = {};
        for (let i = 1; i <= 10; i++) {
            const selected = form.querySelector(`input[name="q${i}"]:checked`);
            if (!selected) {
                if (errEl) errEl.textContent = 'Please rate all areas before submitting.';
                return;
            }
            rating[`q${i}`] = Number(selected.value);
        }

        feedbacks.push({
            id: Date.now().toString(),
            submitted_at: new Date().toISOString(),
            alumni_id: current.id,
            name: document.getElementById('fbName').value.trim(),
            email: document.getElementById('fbEmail').value.trim().toLowerCase(),
            academic_year: document.getElementById('fbAcademicYear').value.trim(),
            present_address: document.getElementById('fbAddress').value.trim(),
            status: statusSelect?.value || 'service',
            designation: designationEl?.value.trim() || '',
            organization: organizationEl?.value.trim() || '',
            program: programEl?.value.trim() || '',
            institution: institutionEl?.value.trim() || '',
            rating
        });

        setData(DATA_KEYS.FEEDBACKS, feedbacks);
        if (successEl) successEl.textContent = 'Feedback submitted successfully. Thank you!';
        form.reset();
        applyStatusFields();
    });
}

// Login form
function setupLoginForm() {
    document.getElementById('loginForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errEl = document.getElementById('loginError');
        errEl.textContent = '';

        const result = auth.login(email, password);
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

    forgotSubmit?.addEventListener('click', () => {
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

        const users = getData(DATA_KEYS.USERS);
        const idx = users.findIndex(u => u.email === email);
        if (idx === -1) {
            errEl.textContent = 'No account found with this email.';
            return;
        }

        users[idx] = { ...users[idx], password: newPassword };
        setData(DATA_KEYS.USERS, users);
        successEl.textContent = 'Password updated successfully. You can now log in with your new password.';
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
    document.getElementById('registerForm')?.addEventListener('submit', function(e) {
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

        const users = getData(DATA_KEYS.USERS);
        const pending = getData(DATA_KEYS.PENDING);
        if (users.some(u => u.email === email) || pending.some(p => p.email === email)) {
            errEl.textContent = 'This email is already registered.';
            return;
        }

        const newAlumni = {
            id: Date.now().toString(),
            email,
            password,
            name,
            batch,
            course,
            company: company || '',
            company_type: companyType,
            role_position: '',
            bio: '',
            role: 'alumni',
            approved: false
        };
        pending.push(newAlumni);
        setData(DATA_KEYS.PENDING, pending);

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
function loadDashboard() {
    const user = auth.getCurrentUser();
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

        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const users = getData(DATA_KEYS.USERS);
            const idx = users.findIndex(u => u.email === user.email);
            if (idx >= 0) {
                users[idx] = {
                    ...users[idx],
                    name: profileForm.querySelector('#profileName').value.trim(),
                    email: profileForm.querySelector('#profileEmail').value.trim(),
                    mobile: profileForm.querySelector('#profileMobile').value.trim(),
                    gender: profileForm.querySelector('#profileGender').value,
                    batch: profileForm.querySelector('#profilePassingYear').value.trim(),
                    course: profileForm.querySelector('#profileCourse').value.trim(),
                    company_type: profileForm.querySelector('#profileCompanyType').value,
                    company: (profileForm.querySelector('#profileCompanyType').value === 'higher'
                        ? profileForm.querySelector('#profileHigherStudiesName').value.trim()
                        : profileForm.querySelector('#profileCompanyName').value.trim()),
                    experience: profileForm.querySelector('#profileExperience').value.trim(),
                    profile_picture: profileForm.querySelector('#profilePicture').value.trim(),
                    skills: profileForm.querySelector('#profileSkills').value.trim(),
                    achievements: profileForm.querySelector('#profileAchievements').value.trim()
                };
                setData(DATA_KEYS.USERS, users);
                sessionStorage.setItem(auth.SESSION_KEY, JSON.stringify(users[idx]));
                alert('Profile updated successfully!');
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

function renderAlumniDirectory() {
    const users = getData(DATA_KEYS.USERS).filter(u => u.role === 'alumni' && u.approved !== false);
    const search = (document.getElementById('directorySearch')?.value || '').toLowerCase();
    const filtered = users.filter(u => 
        !search || 
        (u.name || '').toLowerCase().includes(search) ||
        (u.batch || '').includes(search) ||
        (u.company || '').toLowerCase().includes(search)
    );

    const container = document.getElementById('alumniList');
    if (!container) return;
    container.innerHTML = filtered.map(u => `
        <div class="card">
            <h4>${u.name || 'Alumni'}</h4>
            <p><strong>Batch:</strong> ${u.batch || '-'}</p>
            <p><strong>Course:</strong> ${u.course || '-'}</p>
            <p><strong>${u.company_type === 'higher' ? 'College / University' : 'Current Company'}:</strong> ${u.company || '-'}</p>
        </div>
    `).join('');
}

function renderEvents() {
    const events = getData(DATA_KEYS.EVENTS).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const container = document.getElementById('eventsList');
    if (!container) return;
    container.innerHTML = events.map(e => `
        <div class="card">
            <h4>${e.title}</h4>
            <p><small>${e.date} • ${e.type}</small></p>
            <p>${e.desc}</p>
        </div>
    `).join('');
}

function renderJobs() {
    const jobs = getData(DATA_KEYS.JOBS);
    const container = document.getElementById('jobsList');
    if (!container) return;
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
    document.getElementById('adminNavSearch')?.addEventListener('input', () => {
        renderPending();
        renderAdminAlumni();
    });

    document.getElementById('eventForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const events = getData(DATA_KEYS.EVENTS);
        events.push({
            id: Date.now().toString(),
            title: document.getElementById('eventTitle').value.trim(),
            desc: document.getElementById('eventDesc').value.trim(),
            date: document.getElementById('eventDate').value || new Date().toISOString().slice(0, 10),
            type: document.getElementById('eventType').value
        });
        setData(DATA_KEYS.EVENTS, events);
        this.reset();
        alert('Event/Notice published!');
    });

    document.getElementById('jobForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const jobs = getData(DATA_KEYS.JOBS);
        jobs.push({
            id: Date.now().toString(),
            title: document.getElementById('jobTitle').value.trim(),
            company: document.getElementById('jobCompany').value.trim(),
            desc: document.getElementById('jobDesc').value.trim(),
            type: document.getElementById('jobType').value,
            contact: document.getElementById('jobContact').value.trim()
        });
        setData(DATA_KEYS.JOBS, jobs);
        this.reset();
        alert('Job/Internship posted!');
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        auth.logout();
        window.location.href = 'index.html';
    });

    setupTabs();
    const hash = window.location.hash.replace('#', '');
    if (hash) setActiveTab(hash);
}

function renderPending() {
    const pending = getData(DATA_KEYS.PENDING);
    const container = document.getElementById('pendingList');
    if (!container) return;

    const search = (document.getElementById('adminNavSearch')?.value || '').toLowerCase();
    const filtered = !search
        ? pending
        : pending.filter(p => {
            const nameMatch = (p.name || '').toLowerCase().includes(search);
            const emailMatch = (p.email || '').toLowerCase().includes(search);
            const companyMatch = (p.company || '').toLowerCase().includes(search);
            const batchMatch = (p.batch || '').toString().includes(search);
            return nameMatch || emailMatch || companyMatch || batchMatch;
        });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="card">No pending registrations found.</div>';
        return;
    }

    container.innerHTML = filtered.map(p => `
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

function approveAlumni(id) {
    const pending = getData(DATA_KEYS.PENDING);
    const user = pending.find(p => p.id === id);
    if (!user) return;
    user.approved = true;
    const users = getData(DATA_KEYS.USERS);
    users.push(user);
    setData(DATA_KEYS.USERS, users);
    setData(DATA_KEYS.PENDING, pending.filter(p => p.id !== id));
    renderPending();
    renderAdminAlumni();
}

function rejectAlumni(id) {
    const pending = getData(DATA_KEYS.PENDING).filter(p => p.id !== id);
    setData(DATA_KEYS.PENDING, pending);
    renderPending();
    renderAdminAlumni();
}

function renderAdminAlumni() {
    const users = getData(DATA_KEYS.USERS).filter(u => u.role === 'alumni');
    const search = (document.getElementById('adminNavSearch')?.value || '').toLowerCase();
    const filtered = !search
        ? users
        : users.filter(u => {
            const nameMatch = (u.name || '').toLowerCase().includes(search);
            const emailMatch = (u.email || '').toLowerCase().includes(search);
            const companyMatch = (u.company || '').toLowerCase().includes(search);
            const batchMatch = (u.batch || '').toString().includes(search);
            return nameMatch || emailMatch || companyMatch || batchMatch;
        });

    const container = document.getElementById('adminAlumniList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<div class="card">No alumni found.</div>';
        return;
    }

    container.innerHTML = filtered.map(u => `
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

// Init - only run on index.html
if (document.getElementById('loginModal')) {
    setupModals();
    setupLoginForm();
    setupRegisterForm();
    setupFeedbackForm();
}
