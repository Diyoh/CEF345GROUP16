/**
 * SECURE CODE GENERATION
 *
 * One alphabet, one generator, shared by access codes and Private Confirmation
 * Numbers so the security properties cannot drift between them.
 *
 * Crockford-style alphabet: no 0/O, no 1/I/L. These strings get read off
 * screens, written on paper and typed into phones; ambiguous glyphs cost real
 * support time. crypto.randomInt, never Math.random: both kinds of code ARE the
 * authorization boundary they protect.
 */

import { randomInt } from 'crypto';

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const randomCode = (length) => {
    let out = '';
    for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    return out;
};

/** AB23CD45EF67 renders as AB23-CD45-EF67; the RAW string is what gets hashed. */
export const groupCode = (code, size = 4) =>
    String(code).match(new RegExp(`.{1,${size}}`, 'g')).join('-');
