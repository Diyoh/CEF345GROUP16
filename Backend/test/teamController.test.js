import { jest } from '@jest/globals';

// 1. Mock the database dependency BEFORE importing the controller
jest.unstable_mockModule('../config/db.js', () => ({
  default: {
    query: jest.fn(),
  },
}));

// 2. Import the controller (after the mock is defined)
const { getTeam } = await import('../controllers/teamController.js');
const pool = (await import('../config/db.js')).default;

describe('Team Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {};
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    test('getTeam should return a list of team members', async () => {
        // Mock DB Response
        const mockMembers = [
            { id: 1, name: 'Diyoh', role: 'Dev' },
            { id: 2, name: 'Joyce', role: 'Data' }
        ];
        
        // pool.query returns [rows, fields]
        pool.query.mockResolvedValue([mockMembers, []]);

        await getTeam(req, res);

        // Assertions
        expect(pool.query).toHaveBeenCalledWith('SELECT * FROM team_members');
        expect(res.json).toHaveBeenCalledWith({ success: true, data: mockMembers });
    });

    test('getTeam should handle database errors', async () => {
        // Mock DB Error
        pool.query.mockRejectedValue(new Error('Connection Failed'));

        await getTeam(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Server Error' });
    });
});
