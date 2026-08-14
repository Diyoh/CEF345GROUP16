/**
 * IMAGE DELIVERY REGRESSION
 *
 * Contractors upload phone photos — routinely 3-5MB at 4000px. Serving those into a 400px
 * card is the single largest bandwidth cost in the product, and this audience pays for
 * bandwidth by the megabyte. These tests guard the URL rewriting that prevents it.
 */

import { describe, test, expect } from 'vitest';
import { imageSrc, imageSrcSet, CARD_WIDTHS, THUMB_WIDTHS } from '../utils/images';

const CLOUDINARY = 'https://res.cloudinary.com/demo-cloud/image/upload/v1712345678/buildright_uploads/site-photo-1712345678.jpg';

describe('imageSrc', () => {
  test('asks Cloudinary for the width actually rendered', () => {
    expect(imageSrc(CLOUDINARY, 640)).toContain('/upload/f_auto,q_auto,c_limit,w_640/');
  });

  test('requests a modern format, so a JPEG is delivered as WebP or AVIF', () => {
    expect(imageSrc(CLOUDINARY, 320)).toContain('f_auto');
  });

  test('uses c_limit so a small original is never upscaled', () => {
    // Upscaling would make the file BIGGER than the source for no visual gain.
    expect(imageSrc(CLOUDINARY, 1600)).toContain('c_limit');
  });

  test('rounds fractional widths — Cloudinary rejects a decimal', () => {
    expect(imageSrc(CLOUDINARY, 383.5)).toContain('w_384');
  });

  test('preserves the version and path so the URL still resolves', () => {
    const out = imageSrc(CLOUDINARY, 320);
    expect(out).toContain('v1712345678/buildright_uploads/site-photo-1712345678.jpg');
  });

  test('does not stack transforms on an already-transformed URL', () => {
    const once = imageSrc(CLOUDINARY, 640);
    const twice = imageSrc(once, 320);
    expect(twice).toBe(once);
    expect(twice.match(/f_auto/g)).toHaveLength(1);
  });
});

describe('sources that must pass through untouched', () => {
  test('seeded local paths', () => {
    expect(imageSrc('/pictures/road.jpg', 640)).toBe('/pictures/road.jpg');
  });

  test('a data URI from a photo the user has not uploaded yet', () => {
    const data = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    expect(imageSrc(data, 640)).toBe(data);
  });

  test('an unrelated external host', () => {
    const url = 'https://example.org/photo.jpg';
    expect(imageSrc(url, 640)).toBe(url);
  });

  test('null and undefined do not throw', () => {
    expect(imageSrc(null, 640)).toBeNull();
    expect(imageSrc(undefined, 640)).toBeUndefined();
  });
});

describe('imageSrcSet', () => {
  test('offers every candidate width with its descriptor', () => {
    const set = imageSrcSet(CLOUDINARY, CARD_WIDTHS);
    CARD_WIDTHS.forEach((w) => {
      expect(set).toContain(`w_${w}`);
      expect(set).toContain(`${w}w`);
    });
  });

  test('a phone can pick the smallest candidate', () => {
    // Split on the candidate separator, NOT on every comma: a Cloudinary transform string
    // is itself comma-delimited (f_auto,q_auto,c_limit,w_320).
    const smallest = imageSrcSet(CLOUDINARY, CARD_WIDTHS).split(/,\s+(?=https?:)/)[0];
    expect(smallest).toContain(`w_${Math.min(...CARD_WIDTHS)}`);
  });

  test('candidates remain parseable despite commas inside each URL', () => {
    // srcset is comma-separated and our URLs contain commas. This is legal — the parser
    // collects a URL up to WHITESPACE, so internal commas survive — but it looks wrong at a
    // glance, so it is asserted rather than left to be "fixed" later.
    const candidates = imageSrcSet(CLOUDINARY, CARD_WIDTHS).split(/,\s+(?=https?:)/);
    expect(candidates).toHaveLength(CARD_WIDTHS.length);
    candidates.forEach((c) => {
      const [url, descriptor] = c.trim().split(/\s+/);
      expect(url.startsWith('https://')).toBe(true);
      expect(descriptor).toMatch(/^\d+w$/);
    });
  });

  test('thumbnails ask for thumbnail-sized files', () => {
    expect(imageSrcSet(CLOUDINARY, THUMB_WIDTHS)).toContain('w_96');
  });

  test('returns undefined for sources that cannot be resized, so the attribute is omitted', () => {
    // Emitting srcset="/pictures/road.jpg 320w" would lie about available widths.
    expect(imageSrcSet('/pictures/road.jpg', CARD_WIDTHS)).toBeUndefined();
    expect(imageSrcSet('data:image/png;base64,AAA', CARD_WIDTHS)).toBeUndefined();
    expect(imageSrcSet(null, CARD_WIDTHS)).toBeUndefined();
  });
});
