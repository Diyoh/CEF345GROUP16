/**
 * IMAGE DELIVERY
 *
 * THE PROBLEM THIS SOLVES:
 * Site photos are taken by contractors on phones and uploaded straight to Cloudinary, which
 * stores the original — routinely 3-5MB at 4000px wide. Every one of those was being served
 * at full size and then scaled down by the browser into a 400px card. A browse page with six
 * projects could pull twenty megabytes to render thumbnails.
 *
 * On a metered Cameroonian mobile connection that is not a performance nit. It is the
 * difference between a page that loads and a page nobody can afford to open — and this
 * platform is useless to the people it is written for if they cannot open it.
 *
 * THE FIX:
 * Cloudinary transforms on delivery from the URL itself, so asking for the right size costs
 * nothing but a rewritten string:
 *
 *   /upload/v123/photo.jpg  ->  /upload/f_auto,q_auto,c_limit,w_640/v123/photo.jpg
 *
 *   f_auto   WebP or AVIF when the browser accepts it, typically 25-50% smaller than JPEG
 *   q_auto   per-image quality, chosen from the content rather than a fixed number
 *   c_limit  never UPSCALE — a small original stays small instead of being inflated
 *   w_XXX    the width actually needed at that call site
 *
 * Non-Cloudinary sources (seeded /pictures/... paths, data: URIs from a pending upload,
 * external URLs) pass through untouched.
 */

/** Matches a Cloudinary delivery URL and captures the point where transforms are inserted. */
const CLOUDINARY = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

/** Widths offered to the browser. Kept short: every extra entry is another possible fetch. */
export const CARD_WIDTHS = [320, 480, 640];
export const HERO_WIDTHS = [640, 1024, 1600];
export const FULL_WIDTHS = [640, 1024, 1600];
export const THUMB_WIDTHS = [96, 192];

/**
 * imageSrc
 * @param {string} url
 * @param {number} width  the rendered width in CSS pixels
 * @returns {string} a transformed URL, or the original when it cannot be transformed
 */
export const imageSrc = (url, width) => {
    if (!url || typeof url !== 'string') return url;

    // A data: URI is a photo the user just picked and has not uploaded yet.
    if (url.startsWith('data:')) return url;

    const match = url.match(CLOUDINARY);
    if (!match) return url;

    const [, base, rest] = match;

    // Do not stack transforms if a URL already carries them.
    if (/^[a-z]{1,3}_[^/]+\//.test(rest)) return url;

    const transform = ['f_auto', 'q_auto', 'c_limit', `w_${Math.round(width)}`].join(',');
    return `${base}${transform}/${rest}`;
};

/**
 * imageSrcSet
 * Builds a srcset so the browser picks a width for its own viewport and pixel density.
 * A phone downloads the 320px file; a desktop retina screen downloads the 640px one.
 * Returns undefined for sources that cannot be resized, so the attribute is simply omitted.
 *
 * NOTE: each URL contains commas (f_auto,q_auto,c_limit,w_320) and srcset is itself
 * comma-separated. This is valid — the HTML parser collects a candidate URL up to
 * WHITESPACE, so commas inside it survive — and it is what every Cloudinary srcset looks
 * like. Do not "fix" it by encoding or reformatting the transform string.
 */
export const imageSrcSet = (url, widths = CARD_WIDTHS) => {
    if (!url || typeof url !== 'string' || url.startsWith('data:')) return undefined;
    if (!CLOUDINARY.test(url)) return undefined;

    return widths.map((w) => `${imageSrc(url, w)} ${w}w`).join(', ');
};

/**
 * Common `sizes` values.
 *
 * `sizes` tells the browser how wide the image will BE before layout is known, so it can
 * choose from srcset during preload. Getting it wrong wastes the whole exercise: without it
 * the browser assumes 100vw and downloads the largest candidate every time.
 */
export const SIZES = {
    /** Cards: three per row on desktop, two on tablet, one on mobile. */
    card: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
    /** Full-bleed hero. */
    hero: '100vw',
    /** Detail gallery: two thirds of the content column on desktop. */
    gallery: '(min-width: 1024px) 66vw, 100vw',
    /** Small fixed thumbnails. */
    thumb: '96px',
};
