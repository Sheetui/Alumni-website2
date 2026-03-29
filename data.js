// Data layer - localStorage as mock database (replace with MySQL/API in production)

const DATA_KEYS = {
    USERS: 'alumni_users',
    PENDING: 'alumni_pending',
    EVENTS: 'alumni_events',
    JOBS: 'alumni_jobs',
    FEEDBACKS: 'alumni_feedbacks'
};

function getData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function setData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Initialize demo data if empty
function initDemoData() {
    if (!localStorage.getItem(DATA_KEYS.USERS)) {
        setData(DATA_KEYS.USERS, [
            { id: 'admin', email: 'admin@college.edu', password: 'admin123', role: 'admin', name: 'Admin' },
            {
                id: '1',
                email: 'alumni@test.com',
                password: 'alumni123',
                role: 'alumni',
                name: 'John Doe',
                batch: '2019',
                course: 'Information Technology',
                company: 'Tech Corp',
                company_type: 'company',
                role_position: 'Software Engineer',
                bio: 'Alumni from CS batch 2019.',
                gender: 'Male',
                mobile: '9876543210',
                experience: '3 years',
                skills: 'JavaScript, React, Node.js',
                achievements: 'Best Outgoing Student 2019',
                profile_picture: '',
                approved: true
            }
        ]);
    }
    if (!localStorage.getItem(DATA_KEYS.EVENTS)) {
        setData(DATA_KEYS.EVENTS, [
            { id: '1', title: 'Annual Alumni Meet 2025', desc: 'Join us for the annual alumni reunion. Date: March 15, 2025.', date: '2025-03-15', type: 'event' },
            { id: '2', title: 'Career Workshop', desc: 'Workshop on resume building and interview skills. Open to all alumni and students.', date: '2025-02-25', type: 'event' }
        ]);
    }
    if (!localStorage.getItem(DATA_KEYS.JOBS)) {
        setData(DATA_KEYS.JOBS, [
            { id: '1', title: 'Software Developer', company: 'Tech Solutions', desc: 'Looking for passionate developers. 2+ years experience.', type: 'job', contact: 'hr@techsolutions.com' },
            { id: '2', title: 'Summer Intern - Data Science', company: 'AI Labs', desc: '6-month internship for final year students.', type: 'internship', contact: 'interns@ailabs.com' }
        ]);
    }
    if (!localStorage.getItem(DATA_KEYS.PENDING)) {
        setData(DATA_KEYS.PENDING, []);
    }
    if (!localStorage.getItem(DATA_KEYS.FEEDBACKS)) {
        setData(DATA_KEYS.FEEDBACKS, []);
    }
}

initDemoData();
