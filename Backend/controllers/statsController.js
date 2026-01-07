import pool from '../config/db.js';

export const getGlobalStats = async (req, res) => {
    try {
        const [projects] = await pool.query('SELECT budget, status FROM projects');
        
        const totalProjects = projects.length;
        const totalBudget = projects.reduce((acc, p) => acc + Number(p.budget), 0);
        
        const projectsByStatus = {
            Planned: projects.filter(p => p.status === 'Planned').length,
            Ongoing: projects.filter(p => p.status === 'Ongoing').length,
            Stalled: projects.filter(p => p.status === 'Stalled').length,
            Completed: projects.filter(p => p.status === 'Completed').length
        };

        res.json({
            success: true,
            data: {
                totalProjects,
                totalBudget,
                projectsByStatus
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
