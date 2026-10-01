/**
 * AI PROVIDER SWITCH
 *
 * One small interface in front of every language model the platform can use,
 * chosen by AI_PROVIDER in the environment:
 *
 *   none       AI features are off (the default, so tests, CI and a fresh
 *              install never try to reach a model).
 *   ollama     A free open model running locally under Ollama
 *              (https://ollama.com). Nothing leaves the machine.
 *   anthropic  Claude through the Anthropic API. Needs ANTHROPIC_API_KEY.
 *
 * Every provider does exactly one thing: generateJson() returns an object that
 * matches a JSON schema. Features never see free text from a model, which is
 * what keeps them safe to put in front of the public: the caller validates the
 * object against real data before anything is shown (see projectSearch.js).
 *
 * THE RULE THIS MODULE EXISTS TO KEEP: AI output is advisory. Nothing produced
 * here is written to the ledger, changes a figure, or approves anything.
 */

export class AiUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AiUnavailableError';
    }
}

const DEFAULT_TIMEOUT_MS = 60_000; // a laptop CPU running a 3B model can take a while

const timeoutMs = (env) => Number(env.AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

/** Strips a ```json fence some small models wrap around otherwise valid JSON. */
const parseJsonText = (text) => {
    const trimmed = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
        return JSON.parse(trimmed);
    } catch {
        throw new AiUnavailableError('The model did not return valid JSON');
    }
};

/* ------------------------------------------------------------------ ollama */

/**
 * Ollama's /api/chat accepts a JSON schema in `format` and constrains the
 * model's output to it, so even a small local model returns parseable JSON.
 */
export const createOllamaProvider = (env, fetchImpl = globalThis.fetch) => {
    const baseUrl = (env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
    const model = env.AI_MODEL || 'qwen2.5:3b';

    const call = async (path, init, ms) => {
        try {
            return await fetchImpl(`${baseUrl}${path}`, { ...init, signal: AbortSignal.timeout(ms) });
        } catch (error) {
            const reason = error?.name === 'TimeoutError' ? 'timed out' : 'is not reachable';
            throw new AiUnavailableError(`Ollama at ${baseUrl} ${reason}. Is it running?`);
        }
    };

    return {
        name: 'ollama',
        model,

        async isAvailable() {
            const res = await call('/api/tags', { method: 'GET' }, 3000).catch(() => null);
            if (!res?.ok) return false;
            const body = await res.json().catch(() => ({}));
            // Ollama names pulled models with a tag ("qwen2.5:3b"); a bare name means ":latest".
            const wanted = model.includes(':') ? model : `${model}:latest`;
            return (body.models || []).some((m) => m.name === wanted || m.model === wanted);
        },

        async generateJson({ system, user, schema, maxTokens = 512 }) {
            const res = await call('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    stream: false,
                    format: schema,
                    // Deterministic: the same question should give the same filters.
                    options: { temperature: 0, num_predict: maxTokens },
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user },
                    ],
                }),
            }, timeoutMs(env));

            if (!res.ok) {
                const detail = await res.text().catch(() => '');
                // 404 here means the model has not been pulled.
                if (res.status === 404) {
                    throw new AiUnavailableError(`Ollama has no model "${model}". Run: ollama pull ${model}`);
                }
                throw new AiUnavailableError(`Ollama returned ${res.status}: ${detail.slice(0, 200)}`);
            }
            const body = await res.json();
            return parseJsonText(body?.message?.content);
        },
    };
};

/* --------------------------------------------------------------- anthropic */

/**
 * Claude through the official SDK, imported only when this provider is chosen
 * so a laptop running Ollama never loads it.
 */
export const createAnthropicProvider = (env, loadSdk = () => import('@anthropic-ai/sdk')) => {
    const model = env.AI_MODEL || 'claude-opus-5-5';
    let clientPromise = null;

    const client = async () => {
        if (!env.ANTHROPIC_API_KEY) {
            throw new AiUnavailableError('AI_PROVIDER is anthropic but ANTHROPIC_API_KEY is not set');
        }
        if (!clientPromise) {
            clientPromise = loadSdk().then(({ default: Anthropic }) => new Anthropic({
                apiKey: env.ANTHROPIC_API_KEY,
                timeout: timeoutMs(env),
            }));
        }
        return clientPromise;
    };

    return {
        name: 'anthropic',
        model,

        async isAvailable() {
            return Boolean(env.ANTHROPIC_API_KEY);
        },

        async generateJson({ system, user, schema, maxTokens = 1024 }) {
            const anthropic = await client();
            let response;
            try {
                response = await anthropic.beta.messages.create({
                    model,
                    max_tokens: maxTokens,
                    // A declined request is retried server-side on Anthropic's
                    // recommended fallback model instead of failing outright.
                    betas: ['server-side-fallback-2026-07-01'],
                    fallbacks: 'default',
                    // Mapping a sentence to filters is a light task.
                    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
                    system,
                    messages: [{ role: 'user', content: user }],
                });
            } catch (error) {
                throw new AiUnavailableError(`Anthropic API error: ${error?.message || error}`);
            }

            if (response.stop_reason === 'refusal') {
                throw new AiUnavailableError('The model declined this request');
            }
            const text = response.content.find((block) => block.type === 'text')?.text;
            return parseJsonText(text);
        },
    };
};

/* ------------------------------------------------------------------ switch */

const disabledProvider = {
    name: 'none',
    model: null,
    async isAvailable() { return false; },
    async generateJson() { throw new AiUnavailableError('AI features are turned off (AI_PROVIDER=none)'); },
};

export const PROVIDERS = ['none', 'ollama', 'anthropic'];

/** Builds the provider named by AI_PROVIDER. Unknown names fail loudly at startup. */
export const createProvider = (env = process.env) => {
    const name = String(env.AI_PROVIDER || 'none').trim().toLowerCase();
    switch (name) {
        case 'none': return disabledProvider;
        case 'ollama': return createOllamaProvider(env);
        case 'anthropic': return createAnthropicProvider(env);
        default:
            throw new Error(`Unknown AI_PROVIDER "${name}". Use one of: ${PROVIDERS.join(', ')}`);
    }
};

let current = null;

/** The process-wide provider, built once from the environment. */
export const getProvider = () => {
    if (!current) current = createProvider(process.env);
    return current;
};

/** Tests swap in a fake provider. */
export const setProviderForTests = (provider) => {
    current = provider;
};
