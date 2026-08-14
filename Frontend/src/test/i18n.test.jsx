/**
 * BILINGUAL REGRESSION
 *
 * Cameroon is officially bilingual and the francophone regions are the majority, so a
 * missing or mistranslated string is not cosmetic — it is a citizen unable to read the
 * public spending record.
 *
 * The parity test is the important one here: translation files rot silently. Someone adds an
 * English key, forgets the French, and a francophone reader gets an English sentence with no
 * error anywhere.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach } from 'vitest';

import { I18nProvider, useI18n, useT } from '../i18n';
import { en } from '../i18n/en';
import { fr } from '../i18n/fr';
import { LanguageToggle } from '../components/LanguageToggle';
import { formatMoney, formatPercent, setFormatLocale } from '../utils/helpers';

/** Flattens a nested dictionary to dotted paths for comparison. */
const paths = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object'
      ? paths(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );

describe('dictionary parity', () => {
  test('French defines every key English does', () => {
    const missing = paths(en).filter((k) => !paths(fr).includes(k));
    expect(missing).toEqual([]);
  });

  test('French has no keys English lacks', () => {
    // An orphan French key is dead weight and usually a typo in the key name.
    const orphan = paths(fr).filter((k) => !paths(en).includes(k));
    expect(orphan).toEqual([]);
  });

  test('no French value is left as its English source', () => {
    // Catches keys that were copied over and never actually translated. Proper nouns and
    // identical short words are legitimately the same, so only longer strings are checked.
    const untranslated = paths(en).filter((key) => {
      const read = (d) => key.split('.').reduce((n, p) => (n ? n[p] : undefined), d);
      const e = read(en);
      const f = read(fr);
      return typeof e === 'string' && e === f && e.length > 24;
    });
    expect(untranslated).toEqual([]);
  });

  test('placeholders match between locales', () => {
    // {count} in English and {nombre} in French would render a literal brace at a user.
    const mismatched = paths(en).filter((key) => {
      const read = (d) => key.split('.').reduce((n, p) => (n ? n[p] : undefined), d);
      const e = read(en);
      const f = read(fr);
      if (typeof e !== 'string' || typeof f !== 'string') return false;
      const tokens = (s) => (s.match(/\{(\w+)\}/g) || []).sort().join(',');
      return tokens(e) !== tokens(f);
    });
    expect(mismatched).toEqual([]);
  });
});

const Probe = () => {
  const t = useT();
  const { locale } = useI18n();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="nav">{t('nav.projects')}</span>
      <span data-testid="interp">{t('home.heroLead', { count: 6 })}</span>
      <span data-testid="plural">{t('flags.dormant_detail', { days: 1, count: 1 })}</span>
      <span data-testid="plurals">{t('flags.dormant_detail', { days: 5, count: 5 })}</span>
      <span data-testid="missing">{t('nope.not.here')}</span>
    </div>
  );
};

const renderAt = (locale) =>
  render(
    <I18nProvider initialLocale={locale}>
      <Probe />
    </I18nProvider>
  );

beforeEach(() => {
  localStorage.clear();
  setFormatLocale('en');
});

describe('translation', () => {
  test('renders English', () => {
    renderAt('en');
    expect(screen.getByTestId('nav')).toHaveTextContent('Projects');
  });

  test('renders French', () => {
    renderAt('fr');
    expect(screen.getByTestId('nav')).toHaveTextContent('Projets');
  });

  test('interpolates parameters', () => {
    renderAt('fr');
    expect(screen.getByTestId('interp').textContent).toContain('6 projets');
  });

  test('selects singular and plural forms', () => {
    renderAt('fr');
    expect(screen.getByTestId('plural').textContent).toContain('1 jour.');
    expect(screen.getByTestId('plurals').textContent).toContain('5 jours.');
  });

  test('a missing key degrades to the key, never to "undefined"', () => {
    renderAt('fr');
    expect(screen.getByTestId('missing')).toHaveTextContent('nope.not.here');
  });

  test('sets <html lang> so screen readers switch pronunciation', () => {
    renderAt('fr');
    expect(document.documentElement.lang).toBe('fr');
  });
});

describe('LanguageToggle', () => {
  test('switches language and persists the choice', async () => {
    render(
      <I18nProvider initialLocale="en">
        <LanguageToggle />
        <Probe />
      </I18nProvider>
    );

    expect(screen.getByTestId('nav')).toHaveTextContent('Projects');

    await userEvent.click(screen.getByRole('button', { name: /Français/ }));

    expect(screen.getByTestId('nav')).toHaveTextContent('Projets');
    expect(localStorage.getItem('br-locale')).toBe('fr');
  });

  test('marks the active language for assistive technology', () => {
    render(
      <I18nProvider initialLocale="fr">
        <LanguageToggle />
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: /Français/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /English/ })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('locale-aware number and date formatting', () => {
  test('English uses a period decimal and no space before %', () => {
    setFormatLocale('en');
    expect(formatMoney(85_000_000_000, 'compact')).toBe('85.0bn FCFA');
    expect(formatPercent(55)).toBe('55%');
  });

  test('French uses a comma decimal and a space before %', () => {
    setFormatLocale('fr');
    expect(formatMoney(85_000_000_000, 'compact')).toBe('85,0bn FCFA');
    // Narrow no-break space, as French typography requires.
    expect(formatPercent(55)).toBe('55 %');
  });

  test('FCFA is not translated — it is what the currency is called in both languages', () => {
    setFormatLocale('fr');
    expect(formatMoney(1000, 'full')).toContain('FCFA');
    expect(formatMoney(1000, 'full')).not.toContain('XAF');
  });
});
