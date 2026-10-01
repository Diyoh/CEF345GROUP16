/**
 * The HTTP surface: status reflects the provider, a working search returns
 * filters, and a missing model is a 503 with a plain message, never a 500.
 */

import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockPool = { query: jest.fn(async () => [[
    { id: 'r-nw', type: 'REGION', code: 'NW', name_en: 'North-West', name_fr: 'Nord-Ouest', parent_id: 'nat' },
], []]) };
jest.unstable_mockModule('../config/db.js', () => ({ default: mockPool, withTransaction: jest.fn() }));

const { setProviderForTests, AiUnavailableError } = await import('../services/ai/providers.js');
const { resetStatusCacheForTests } = await import('../controllers/aiController.js');
const { default: aiRoutes } = await import('../routes/aiRoutes.js');

const app = express();
app.use(express.json());
app.use('/api/v1/ai', aiRoutes);

const provider = (overrides) => ({ name: 'fake', model: 'fake-1', isAvailable: async () => true, generateJson: async () => ({}), ...overrides });

beforeEach(() => resetStatusCacheForTests());

test('status reports an available provider', async () => {
    setProviderForTests(provider());
    const res = await request(app).get('/api/v1/ai/status');
    expect(res.body).toEqual({ success: true, data: { enabled: true, provider: 'fake', model: 'fake-1' } });
});

test('status reports disabled when the model is not reachable', async () => {
    setProviderForTests(provider({ isAvailable: async () => false }));
    const res = await request(app).get('/api/v1/ai/status');
    expect(res.body.data).toEqual({ enabled: false, provider: 'fake', model: null });
});

test('search returns filters', async () => {
    setProviderForTests(provider());
    const res = await request(app).post('/api/v1/ai/search').send({ query: 'stalled in the north west', locale: 'en' });
    expect(res.status).toBe(200);
    expect(res.body.data.filters).toEqual({ status: 'Stalled', region: 'NW' });
});

test('a model that is down is a 503 with a plain message', async () => {
    setProviderForTests(provider({ generateJson: async () => { throw new AiUnavailableError('Ollama at x is not reachable'); } }));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await request(app).post('/api/v1/ai/search').send({ query: 'stalled roads' });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/unavailable/);
    expect(res.body.error).not.toMatch(/Ollama/);
    warn.mockRestore();
});

test('a bad question is a 400', async () => {
    setProviderForTests(provider());
    const res = await request(app).post('/api/v1/ai/search').send({ query: '' });
    expect(res.status).toBe(400);
});
