/**
 * REQUIRED SECRETS
 *
 * Production must never run on a missing, placeholder or guessable secret, so
 * the server checks them before it listens and refuses to start otherwise.
 *
 * LEDGER_HMAC_KEY matters most. It signs every financial ledger entry, and in
 * development the ledger falls back to a key derived from JWT_SECRET. Letting
 * that fallback reach production would tie every past signature to the login
 * secret, so rotating JWT_SECRET after a leak would orphan the whole ledger.
 */

// Values copied straight from .env.example or docker-compose.yml.
const PLACEHOLDERS = new Set([
    'your_super_secret_jwt_key',
    'your_secure_random_string',
    'set_a_long_random_value_here',
    'dev-ledger-key-not-for-production',
]);

const MIN_LENGTH = 32;

/**
 * Returns the problems with the secrets in `env`, one string each; an empty
 * array means production may start. Outside production nothing is required.
 */
export const findSecretProblems = (env = process.env) => {
    if (env.NODE_ENV !== 'production') return [];

    const problems = [];
    for (const name of ['JWT_SECRET', 'LEDGER_HMAC_KEY']) {
        const value = env[name];
        if (!value) problems.push(`${name} is not set`);
        else if (PLACEHOLDERS.has(value)) problems.push(`${name} still holds the example value`);
        else if (value.length < MIN_LENGTH) problems.push(`${name} is shorter than ${MIN_LENGTH} characters`);
    }
    if (env.JWT_SECRET && env.JWT_SECRET === env.LEDGER_HMAC_KEY) {
        problems.push('LEDGER_HMAC_KEY must differ from JWT_SECRET');
    }
    return problems;
};
