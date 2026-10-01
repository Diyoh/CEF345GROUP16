/**
 * The provider switch: each provider turns a schema request into an object,
 * fails with AiUnavailableError (never a crash) when its model is not there,
 * and the switch rejects unknown names. No real model is called.
 */

import { jest } from '@jest/globals';
import {
    createProvider, createOllamaProvider, createAnthropicProvider, AiUnavailableError,
} from '../services/ai/providers.js';

const SCHEMA = { type: 'object', properties: { status: { type: 'string' } } };
const jsonResponse = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

describe('createProvider', () => {
    test('defaults to off', async () => {
        const provider = createProvider({});
        expect(provider.name).toBe('none');
        expect(await provider.isAvailable()).toBe(false);
        await expect(provider.generateJson({})).rejects.toBeInstanceOf(AiUnavailableError);
    });

    test('builds ollama and anthropic by name, case-insensitively', () => {
        expect(createProvider({ AI_PROVIDER: 'Ollama' }).name).toBe('ollama');
        expect(createProvider({ AI_PROVIDER: 'anthropic' }).name).toBe('anthropic');
    });

    test('an unknown provider fails loudly', () => {
        expect(() => createProvider({ AI_PROVIDER: 'olama' })).toThrow('Unknown AI_PROVIDER "olama"');
    });
});

describe('ollama provider', () => {
    test('sends the schema as format and returns the parsed object', async () => {
        const fetchImpl = jest.fn(async () => jsonResponse(200, { message: { content: '{"status":"Stalled"}' } }));
        const provider = createOllamaProvider({ OLLAMA_URL: 'http://laptop:11434/', AI_MODEL: 'llama3.2:3b' }, fetchImpl);

        const result = await provider.generateJson({ system: 'sys', user: 'stalled roads', schema: SCHEMA });

        expect(result).toEqual({ status: 'Stalled' });
        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe('http://laptop:11434/api/chat');
        const body = JSON.parse(init.body);
        expect(body).toMatchObject({ model: 'llama3.2:3b', stream: false, format: SCHEMA, options: { temperature: 0 } });
        expect(body.messages).toEqual([{ role: 'system', content: 'sys' }, { role: 'user', content: 'stalled roads' }]);
    });

    test('tolerates a ```json fence around the answer', async () => {
        const fetchImpl = async () => jsonResponse(200, { message: { content: '```json\n{"status":""}\n```' } });
        const provider = createOllamaProvider({}, fetchImpl);
        expect(await provider.generateJson({ schema: SCHEMA })).toEqual({ status: '' });
    });

    test('a model that has not been pulled says how to pull it', async () => {
        const provider = createOllamaProvider({ AI_MODEL: 'qwen2.5:3b' }, async () => jsonResponse(404, { error: 'model not found' }));
        await expect(provider.generateJson({ schema: SCHEMA })).rejects.toThrow('ollama pull qwen2.5:3b');
    });

    test('Ollama not running is an AiUnavailableError, not a crash', async () => {
        const provider = createOllamaProvider({}, async () => { throw new TypeError('fetch failed'); });
        await expect(provider.generateJson({ schema: SCHEMA })).rejects.toThrow('is not reachable');
        expect(await provider.isAvailable()).toBe(false);
    });

    test('non-JSON output is an AiUnavailableError', async () => {
        const provider = createOllamaProvider({}, async () => jsonResponse(200, { message: { content: 'Sure! Here are filters' } }));
        await expect(provider.generateJson({ schema: SCHEMA })).rejects.toBeInstanceOf(AiUnavailableError);
    });

    test('isAvailable is true only when the configured model is pulled', async () => {
        const tags = async () => jsonResponse(200, { models: [{ name: 'qwen2.5:3b' }, { name: 'llama3.2:latest' }] });
        expect(await createOllamaProvider({ AI_MODEL: 'qwen2.5:3b' }, tags).isAvailable()).toBe(true);
        expect(await createOllamaProvider({ AI_MODEL: 'llama3.2' }, tags).isAvailable()).toBe(true);
        expect(await createOllamaProvider({ AI_MODEL: 'mistral' }, tags).isAvailable()).toBe(false);
    });
});

describe('anthropic provider', () => {
    const fakeSdk = (response) => {
        const create = jest.fn(async () => response);
        class FakeAnthropic { constructor(opts) { this.opts = opts; this.beta = { messages: { create } }; } }
        return { create, load: async () => ({ default: FakeAnthropic }) };
    };

    test('without a key it is unavailable and never loads the SDK', async () => {
        const load = jest.fn();
        const provider = createAnthropicProvider({}, load);
        expect(await provider.isAvailable()).toBe(false);
        await expect(provider.generateJson({ schema: SCHEMA })).rejects.toThrow('ANTHROPIC_API_KEY is not set');
        expect(load).not.toHaveBeenCalled();
    });

    test('requests structured output and parses the text block', async () => {
        const sdk = fakeSdk({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"status":"Completed"}' }] });
        const provider = createAnthropicProvider({ ANTHROPIC_API_KEY: 'k' }, sdk.load);

        expect(await provider.generateJson({ system: 's', user: 'u', schema: SCHEMA })).toEqual({ status: 'Completed' });
        const params = sdk.create.mock.calls[0][0];
        expect(params.model).toBe('claude-opus-5-5');
        expect(params.output_config.format).toEqual({ type: 'json_schema', schema: SCHEMA });
        expect(params.fallbacks).toBe('default');
        expect(params.betas).toEqual(['server-side-fallback-2026-07-01']);
    });

    test('a refusal is reported, not parsed', async () => {
        const sdk = fakeSdk({ stop_reason: 'refusal', content: [] });
        const provider = createAnthropicProvider({ ANTHROPIC_API_KEY: 'k' }, sdk.load);
        await expect(provider.generateJson({ schema: SCHEMA })).rejects.toThrow('declined');
    });
});
