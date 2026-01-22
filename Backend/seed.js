import pool from './config/db.js';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
    try {
        console.log('Starting seed process...');
        
        // 1. CLEAR EXISTING DATA (Optional, use with caution in prod)
        // We delete in reverse order of foreign key dependencies
        await pool.query('DELETE FROM comment_images');
        await pool.query('DELETE FROM comments');
        await pool.query('DELETE FROM project_updates');
        await pool.query('DELETE FROM project_images');
        await pool.query('DELETE FROM projects');
        await pool.query('DELETE FROM access_codes');
        await pool.query('DELETE FROM users');
        await pool.query('DELETE FROM team_members');
        
        console.log('Table data cleared.');

        // 2. SEED USERS
        // Note: Using hardcoded UUIDs so we can link them easily in this script
        const users = [
          { id: 'u1', name: 'Admin User', role: 'ADMIN', email: 'admin@buildright.cm' },
          { id: 'u2', name: 'BTP Cameroun S.A.', role: 'CONTRACTOR', email: 'contact@btpcameroun.cm' },
          { id: 'u3', name: 'BuildFast Const', role: 'CONTRACTOR', email: 'info@buildfast.cm' },
          { id: 'u4', name: 'Dev Team Lead', role: 'DEVELOPER_ADMIN', email: 'dev@buildright.cm' },
          // New Developer Accounts
          { id: 'dev1', name: 'Diyoh Shiloh', role: 'DEVELOPER_ADMIN', email: 'diyoh@buildright.cm' },
          { id: 'dev2', name: 'Asobo Joyce', role: 'DEVELOPER_ADMIN', email: 'joyce@buildright.cm' },
          { id: 'dev3', name: 'Shots Fo Real', role: 'DEVELOPER_ADMIN', email: 'shots@buildright.cm' },
          { id: 'dev4', name: 'Soh Marrious', role: 'DEVELOPER_ADMIN', email: 'soh@buildright.cm' },
          { id: 'dev5', name: 'Gboyz', role: 'DEVELOPER_ADMIN', email: 'gboyz@buildright.cm' },
        ];

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password', salt); // Default password for all

        for (const u of users) {
             await pool.query(
                'INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)',
                [u.id, u.name, u.email, u.role, passwordHash]
             );
        }
        console.log('Users seeded.');

        // 3. SEED PROJECTS
        const projects = [
            {
                id: 'p1',
                title: 'Yaoundé-Douala Highway Phase 2',
                description: 'Construction of the remaining 60km section connecting the two major economic hubs.',
                location: 'Edéa',
                region: 'Littoral',
                budget: 85000000000,
                spent: 45000000000,
                progress: 55,
                status: 'Ongoing',
                contractor_id: 'u2', // BTP Cameroun
                start_date: '2023-01-15',
                completion_date: '2026-06-30'
            },
            {
                id: 'p2',
                title: 'Regional Hospital Maroua',
                description: 'Modernization of the regional hospital including new pediatric wing.',
                location: 'Maroua',
                region: 'Far North',
                budget: 12000000000,
                spent: 11500000000,
                progress: 100,
                status: 'Completed',
                contractor_id: 'u3',
                start_date: '2022-03-10',
                completion_date: '2024-01-20'
            },
            {
                id: 'p3',
                title: 'Rural Electrification - East Region',
                description: 'Installation of solar grids in 50 villages.',
                location: 'Bertoua',
                region: 'East',
                budget: 5000000000,
                spent: 1000000000,
                progress: 20,
                status: 'Stalled',
                contractor_id: 'u2',
                start_date: '2024-01-01',
                completion_date: '2025-12-31'
            },
             {
                id: 'p4',
                title: 'New Community Library',
                description: 'A modern library facility for the university district.',
                location: 'Buea',
                region: 'South West',
                budget: 250000000,
                spent: 0,
                progress: 0,
                status: 'Planned',
                contractor_id: 'u3',
                start_date: '2025-06-01',
                completion_date: '2026-01-01'
            }
        ];

        for (const p of projects) {
            await pool.query(
                'INSERT INTO projects (id, title, description, location, region, budget, spent, progress, status, contractor_id, start_date, completion_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [p.id, p.title, p.description, p.location, p.region, p.budget, p.spent, p.progress, p.status, p.contractor_id, p.start_date, p.completion_date]
            );
        }
        console.log('Projects seeded.');

        // 4. SEED PROJECT IMAGES (URLs only, no base64 in seed usually unless we mock urls)
        // We will just use the paths from frontend data as URLs. Frontend expects them to be served or valid.
        // Frontend paths: '/pictures/...'
        const projectImages = [
            { id: 'img1', project_id: 'p1', image_url: '/pictures/upbeat-gen-z-girl-reading-messages-phone.jpg', is_main: true },
            { id: 'img2', project_id: 'p1', image_url: '/pictures/beautiful-smiling-african-american-woman-using-phone-outdoors.jpg', is_main: false },
            { id: 'img3', project_id: 'p2', image_url: '/pictures/upbeat-gen-z-girl-reading-messages-phone.jpg', is_main: true },
            { id: 'img4', project_id: 'p2', image_url: '/pictures/beautiful-smiling-african-american-woman-using-phone-outdoors.jpg', is_main: false },
            { id: 'img5', project_id: 'p3', image_url: '/pictures/upbeat-gen-z-girl-reading-messages-phone.jpg', is_main: true },
            { id: 'img6', project_id: 'p4', image_url: '/pictures/Bullseye PNG.jpg', is_main: true },
        ];

        for (const img of projectImages) {
             await pool.query(
                'INSERT INTO project_images (id, project_id, image_url, is_main_cover) VALUES (?, ?, ?, ?)',
                [img.id, img.project_id, img.image_url, img.is_main]
             );
        }
        console.log('Project images seeded.');

        // 5. SEED UPDATES
        const updates = [
            { id: 'up1', project_id: 'p1', message: 'Foundation work completed for bridge section.', author_name: 'Admin User', update_date: '2023-11-20' },
            { id: 'up2', project_id: 'p3', message: 'Equipment delivery delayed due to customs.', author_name: 'BTP Cameroun S.A.', update_date: '2024-02-15' }
        ];

        for (const up of updates) {
            await pool.query(
                'INSERT INTO project_updates (id, project_id, message, author_name, update_date) VALUES (?, ?, ?, ?, ?)',
                [up.id, up.project_id, up.message, up.author_name, up.update_date]
            );
        }
         console.log('Project updates seeded.');

        // 6. SEED COMMENTS
        const comments = [
             {
                id: 'c1',
                projectId: 'p1',
                authorName: 'Jean K.',
                authorType: 'Citizen',
                text: 'Work seems to be moving fast near the river.',
                date: '2024-02-10'
            },
            {
                id: 'c2',
                projectId: 'p1',
                authorName: 'EcoWatch Cameroon',
                authorType: 'NGO',
                text: 'We are concerned about the drainage system planning.',
                date: '2024-02-12'
            }
        ];

        for (const c of comments) {
            await pool.query(
                'INSERT INTO comments (id, project_id, author_name, author_type, text) VALUES (?, ?, ?, ?, ?)',
                [c.id, c.projectId, c.authorName, c.authorType, c.text]
            );
        }
        console.log('Comments seeded.');

        // 7. SEED TEAM
        const team = [
            { id: 't1', name: 'Diyoh shiloh', role: 'Lead Engineer', bio: 'SOFTWARE engineer with 15 years experience in public works monitoring.', imageUrl: '/pictures/Doc 2.png' },
            { id: 't2', name: 'ASOBO JOYCE', role: 'Data Scientist', bio: 'Specialist in detecting financial anomalies in public datasets.', imageUrl: '/pictures/Doc 2.png' },
            { id: 't3', name: 'SHOTS FO REAL', role: 'Development Team', bio: 'The brilliant minds behind the BuildRight platform.', imageUrl: '/pictures/Doc 2.png' },
            { id: 't4', name: 'soh marrious', role: 'Development Team', bio: 'The brilliant minds behind the BuildRight platform.', imageUrl: '/pictures/Doc 2.png' },
            { id: 't5', name: 'Gboyz', role: 'Development Team', bio: 'The brilliant minds behind the BuildRight platform.', imageUrl: '/pictures/Doc 2.png' },
        ];

        for (const t of team) {
            await pool.query(
                'INSERT INTO team_members (id, name, role, bio, image_url) VALUES (?, ?, ?, ?, ?)',
                [t.id, t.name, t.role, t.bio, t.imageUrl]
            );
        }
        console.log('Team seeded.');

        // 8. SEED ACCESS CODES
        const accessCodes = [
            { code: 'DEV123', role: 'DEVELOPER_ADMIN' },
            { code: 'ADMIN123', role: 'ADMIN' },
            { code: 'CONTR123', role: 'CONTRACTOR' }
        ];

        for (const ac of accessCodes) {
             await pool.query(
                'INSERT INTO access_codes (code, role, generated_by_user_id) VALUES (?, ?, ?)',
                [ac.code, ac.role, 'u1'] // Generated by Admin (u1)
             );
        }
        console.log('Access codes seeded.');

        console.log('Database seeded successfully!');
        process.exit();

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedDatabase();
