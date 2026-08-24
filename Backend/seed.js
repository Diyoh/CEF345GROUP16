import pool from './config/db.js';
import bcrypt from 'bcryptjs';

/**
 * Seed dates are RELATIVE to the day the seed runs.
 *
 * They used to be hardcoded ('2026-06-30'), which was sensible when written and quietly
 * decayed: every demo project drifted past its completion date and stopped being updated,
 * so a freshly seeded database showed almost every project flagged past-due and dormant.
 * Flags that fire on everything are wallpaper — readers stop seeing them, which defeats the
 * point of having them.
 *
 * The dataset below is also deliberately shaped so each anomaly appears roughly once: one
 * healthy project, one over budget, one spending far ahead of building, one stalled, one
 * genuinely overdue, one not started. A demo should exercise the product, not just fill it.
 */
const day = 24 * 60 * 60 * 1000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * day).toISOString().split('T')[0];
const daysAgo = (n) => iso(-n);
const daysAhead = (n) => iso(n);

const seedDatabase = async () => {
    try {
        console.log('Starting seed process...');
        
        // 1. CLEAR EXISTING DATA (Optional, use with caution in prod)
        // We delete in reverse order of foreign key dependencies
        await pool.query('DELETE FROM comment_images');
        await pool.query('DELETE FROM comments');
        await pool.query('DELETE FROM project_updates');
        await pool.query('DELETE FROM project_images');
        await pool.query('DELETE FROM project_areas');
        await pool.query('DELETE FROM contractor_documents');
        await pool.query('DELETE FROM contractor_profiles');
        await pool.query('DELETE FROM projects');
        await pool.query('DELETE FROM access_codes');
        await pool.query('DELETE FROM users');
        await pool.query('DELETE FROM team_members');
        
        console.log('Table data cleared.');

        // 2. SEED USERS
        // Note: Using hardcoded UUIDs so we can link them easily in this script
        const users = [
          { id: 'u1', name: 'Admin User', role: 'PLATFORM_ADMIN', email: 'admin@buildright.cm' },
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

        // Entity administrator demo accounts, when the hierarchy is seeded
        // (run seed:entities first). Their shared demo PCN is printed below so
        // the G3 confirmation flow can be exercised without registering anew.
        const DEMO_PCN = 'AB23CD45EF67';
        const pcnHash = await bcrypt.hash(DEMO_PCN, salt);
        const [entityRows] = await pool.query(
            "SELECT id, code FROM gov_entities WHERE code IN ('MINFI','MINTP','NW-BAMENDA-I')"
        );
        const entityByCode = Object.fromEntries(entityRows.map(e => [e.code, e.id]));

        const entityAdmins = [
            { id: 'ent1', name: 'MINFI Finance Desk', email: 'finance@minfi.cm', code: 'MINFI' },
            { id: 'ent2', name: 'MINTP Works Desk', email: 'works@mintp.cm', code: 'MINTP' },
            { id: 'ent3', name: 'Bamenda I Council Desk', email: 'council@bamenda1.cm', code: 'NW-BAMENDA-I' },
        ];
        let entityAdminCount = 0;
        for (const admin of entityAdmins) {
            const entityId = entityByCode[admin.code];
            if (!entityId) continue; // hierarchy not seeded yet; run seed:entities, then seed again
            await pool.query(
                'INSERT INTO users (id, name, email, role, password_hash, entity_id, pcn_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [admin.id, admin.name, admin.email, 'ENTITY_ADMIN', passwordHash, entityId, pcnHash]
            );
            entityAdminCount += 1;
        }
        console.log(entityAdminCount > 0
            ? `Entity admins seeded (${entityAdminCount}). Demo PCN for all of them: AB23-CD45-EF67`
            : 'Entity admins skipped: run seed:entities first, then seed again.');

        // Contractor verification files. One VERIFIED so assignment works out of
        // the box, one PENDING so the MINTP queue has something to decide.
        await pool.query(
            "INSERT INTO contractor_profiles (user_id, company_name, rccm_number, taxpayer_number, status, verified_by, verified_at) VALUES ('u2', 'BTP Cameroun S.A.', 'RC/DLA/2015/B/1234', 'M051512345678A', 'VERIFIED', 'u1', NOW())"
        );
        await pool.query(
            "INSERT INTO contractor_profiles (user_id, company_name, status) VALUES ('u3', 'BuildFast Const', 'PENDING')"
        );
        console.log('Contractor profiles seeded: BTP Cameroun VERIFIED, BuildFast PENDING.');

        // 3. SEED PROJECTS
        // Each project is written to demonstrate a specific state. See the flag definitions
        // in services/projectFlags.js — the shapes here are chosen to match them.
        const projects = [
            {
                // HEALTHY: build and spend track each other, comfortably inside its window.
                id: 'p1',
                title: 'Yaoundé-Douala Highway Phase 2',
                description: 'Construction of the remaining 60km section connecting the two major economic hubs.',
                location: 'Edéa',
                region: 'Littoral',
                budget: 85000000000,
                spent: 44000000000,
                progress: 55,
                status: 'Ongoing',
                contractor_id: 'u2',
                start_date: daysAgo(400),
                completion_date: daysAhead(300)
            },
            {
                // COMPLETED: finished slightly under budget. Carries no flags at all, which
                // matters — a reader must see that a clean project looks clean.
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
                start_date: daysAgo(900),
                completion_date: daysAgo(200)
            },
            {
                // STALLED: reported stalled, and deliberately NOT also flagged dormant —
                // the stall already explains the silence.
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
                start_date: daysAgo(220),
                completion_date: daysAhead(120)
            },
            {
                // NOT STARTED: approved, work begins later. Exempt from dormant, because a
                // project cannot be behind on reporting before it begins.
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
                start_date: daysAhead(45),
                completion_date: daysAhead(400)
            },
            {
                // SPENDING FAR AHEAD OF BUILDING: the headline anomaly this product exists
                // to surface. 78% of the money gone, 20% of the work done.
                id: 'p5',
                title: 'Bamenda Ring Road Section 4',
                description: 'Resurfacing and drainage works on the northern ring road.',
                location: 'Bamenda',
                region: 'North West',
                budget: 9000000000,
                spent: 7020000000,
                progress: 20,
                status: 'Ongoing',
                contractor_id: 'u2',
                start_date: daysAgo(180),
                completion_date: daysAhead(90)
            },
            {
                // OVER BUDGET and PAST DUE: money exhausted, deadline gone, work unfinished.
                id: 'p6',
                title: 'Kribi Water Treatment Plant',
                description: 'Construction of a municipal water treatment and distribution facility.',
                location: 'Kribi',
                region: 'South',
                budget: 3000000000,
                spent: 3450000000,
                progress: 70,
                status: 'Ongoing',
                contractor_id: 'u3',
                start_date: daysAgo(500),
                completion_date: daysAgo(60)
            }
        ];

        for (const p of projects) {
            await pool.query(
                'INSERT INTO projects (id, title, description, location, region, budget, spent, progress, status, contractor_id, start_date, completion_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [p.id, p.title, p.description, p.location, p.region, p.budget, p.spent, p.progress, p.status, p.contractor_id, p.start_date, p.completion_date]
            );
        }
        console.log('Projects seeded.');

        // Place the demo projects in the hierarchy when it exists, so seed order
        // stops mattering: entities first, then this script, nothing else needed.
        const [mintpRows] = await pool.query("SELECT id FROM gov_entities WHERE code = 'MINTP'");
        if (mintpRows.length > 0) {
            const regionMap = {
                'Adamaoua': 'AD', 'Centre': 'CE', 'East': 'EA', 'Far North': 'FN', 'Littoral': 'LT',
                'North': 'NO', 'North West': 'NW', 'South': 'SO', 'South West': 'SW', 'West': 'WE',
            };
            const [regionRows] = await pool.query("SELECT id, code FROM gov_entities WHERE type = 'REGION'");
            const regionByCode = Object.fromEntries(regionRows.map(r => [r.code, r.id]));
            for (const p of projects) {
                const regionId = regionByCode[regionMap[p.region]];
                if (!regionId) continue;
                await pool.query('UPDATE projects SET owner_entity_id = ? WHERE id = ?', [mintpRows[0].id, p.id]);
                await pool.query('INSERT IGNORE INTO project_areas (project_id, entity_id) VALUES (?, ?)', [p.id, regionId]);
            }
            console.log('Projects placed in the hierarchy (owner MINTP, region areas).');
        }

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
            // p5 is documented, so it demonstrates "spending ahead of building" on its own.
            // p6 is deliberately left without photos: a project that exhausted its budget and
            // missed its deadline plausibly also skipped its uploads, which is exactly the
            // combination the no_evidence check exists to surface.
            { id: 'img7', project_id: 'p5', image_url: '/pictures/upbeat-gen-z-girl-reading-messages-phone.jpg', is_main: true },
            { id: 'img8', project_id: 'p5', image_url: '/pictures/beautiful-smiling-african-american-woman-using-phone-outdoors.jpg', is_main: false },
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
            { id: 'up1', project_id: 'p1', message: 'Foundation work completed for bridge section.', author_name: 'Admin User', update_date: daysAgo(120) },
            { id: 'up2', project_id: 'p3', message: 'Equipment delivery delayed due to customs.', author_name: 'BTP Cameroun S.A.', update_date: daysAgo(30) }
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
            { id: 't1', name: 'Diyoh Shiloh', role: 'Lead Engineer', bio: 'Full stack engineer based in Buea, Cameroon, with 5 years building reliable web and mobile products front to back. Cares most about correctness where it is hard.', imageUrl: '/pictures/shiloh-2.jpeg' },
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
