import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, EmptyState } from './ui';

/**
 * Photo gallery and lightbox. Spec: docs/design/03-components.md section 16.
 *
 * 4:3 tiles because construction photography is rarely 16:9. Every image carries
 * intrinsic dimensions and lazy loading, so a slow connection never shifts the page.
 * In a transparency product photos are the proof layer, so they sit above the prose.
 */
export const PhotoGallery = ({ images = [], title = '' }) => {
  const [openIndex, setOpenIndex] = useState(null);
  const tileRefs = useRef([]);
  const isOpen = openIndex !== null;

  const close = useCallback(() => {
    const returnTo = tileRefs.current[openIndex];
    setOpenIndex(null);
    // Focus returns to the tile that opened the lightbox.
    if (returnTo instanceof HTMLElement) requestAnimationFrame(() => returnTo.focus());
  }, [openIndex]);

  const step = useCallback(
    (delta) => setOpenIndex((i) => (i === null ? null : (i + delta + images.length) % images.length)),
    [images.length]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close, step]);

  if (images.length === 0) {
    return (
      <EmptyState
        icon="fa-camera"
        title="No site photos yet"
        body="Photos are uploaded by the contractor as work progresses."
      />
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={i}>
            <button
              ref={(el) => {
                tileRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={`Open photo ${i + 1} of ${images.length}`}
              className="group relative block aspect-photo w-full overflow-hidden rounded-md bg-sunken"
            >
              <img
                src={img}
                alt=""
                width="800"
                height="600"
                loading={i < 4 ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-base ease-standard group-hover:scale-[1.03]"
              />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-xs bg-[rgb(var(--overlay)/0.65)] px-1.5 py-0.5 text-overline uppercase text-white">
                  Cover
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${openIndex + 1} of ${images.length}${title ? `, ${title}` : ''}`}
          className="fixed inset-0 z-50 flex flex-col bg-[rgb(var(--overlay)/0.92)] animate-fade-in"
        >
          <div className="flex items-center justify-between gap-4 p-4 text-white">
            <p className="tabular text-caption">
              {openIndex + 1} of {images.length}
            </p>
            <Button
              variant="ghost"
              size="lg"
              iconOnly
              onClick={close}
              aria-label="Close photo viewer"
              className="text-white hover:bg-white/10"
              leadingIcon={<i className="fas fa-xmark" aria-hidden="true" />}
            />
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
            <img
              src={images[openIndex]}
              alt={title ? `${title}, photo ${openIndex + 1}` : `Photo ${openIndex + 1}`}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {images.length > 1 && (
            <div className="flex items-center justify-center gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                variant="ghost"
                size="lg"
                iconOnly
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className="text-white hover:bg-white/10"
                leadingIcon={<i className="fas fa-chevron-left" aria-hidden="true" />}
              />
              <Button
                variant="ghost"
                size="lg"
                iconOnly
                onClick={() => step(1)}
                aria-label="Next photo"
                className="text-white hover:bg-white/10"
                leadingIcon={<i className="fas fa-chevron-right" aria-hidden="true" />}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};
