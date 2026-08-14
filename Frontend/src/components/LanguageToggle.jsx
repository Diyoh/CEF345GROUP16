import React from 'react';
import { useI18n, SUPPORTED_LOCALES } from '../i18n';
import { cn } from './ui';

/**
 * Language switch.
 *
 * A segmented two-state control rather than a dropdown: with exactly two options a select
 * costs a tap to open, a tap to choose, and hides the alternative behind a menu. Both labels
 * stay visible so a francophone visitor landing on an English page can see the way out
 * immediately, which is the whole point.
 *
 * Each option carries `lang` so a screen reader pronounces "Français" in French rather than
 * reading it with English phonetics, and `aria-pressed` so the current choice is announced.
 */
export const LanguageToggle = ({ className }) => {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className={cn('inline-flex items-center rounded-full border border-line p-0.5', className)}
    >
      {SUPPORTED_LOCALES.map((option) => {
        const isActive = option.code === locale;
        return (
          <button
            key={option.code}
            type="button"
            lang={option.code}
            onClick={() => setLocale(option.code)}
            aria-pressed={isActive}
            title={option.label}
            className={cn(
              'hit-target relative rounded-full px-2.5 py-1 text-caption font-medium transition-colors duration-instant',
              isActive
                ? 'bg-accent-fill text-accent-fg'
                : 'text-fg-tertiary hover:text-fg'
            )}
          >
            {option.short}
            {/* The full name is the accessible name; the two letters are only the visual. */}
            <span className="sr-only"> — {option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
