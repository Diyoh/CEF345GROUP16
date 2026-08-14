/**
 * Formatting helpers.
 * Spec: docs/design/04-dataviz.md section 2.
 *
 * There is ONE money formatter in this app. Before this file there were two, and they
 * disagreed: helpers.js emitted "85 000 000 000 FCFA" while ContractorAnalyticsModal
 * emitted "85.0B FCFA".
 *
 * Decisions encoded here:
 *  - Unit is FCFA, not XAF. It is what the currency is called in daily written use in
 *    Cameroon. XAF is retained for machine contexts only (CSV headers, API contracts).
 *  - Suffixes are k / m / bn, lowercase. Not "B", which reads as billion in English and
 *    collides with French milliard in a country where both languages are official.
 *  - Group separator is a narrow no-break space (correct in French and in SI), decimal
 *    separator is a period (matches the English interface). Mixing a comma decimal into
 *    an English UI is how 4,5 gets read as forty-five.
 */

const NNBSP = ' '; // narrow no-break space, escaped so no editor can flatten it

/**
 * The active locale, kept as module state and synced by I18nProvider.
 *
 * Deliberate trade-off: threading a locale argument through every existing call site of
 * formatMoney/formatDate would touch most components for a value that is global anyway. The
 * cost is that these functions are not pure — acceptable because they are display-only, and
 * components re-render on locale change through the i18n context regardless.
 */
let activeLocale = 'en';

export const setFormatLocale = (locale) => {
  activeLocale = locale === 'fr' ? 'fr' : 'en';
};

export const getFormatLocale = () => activeLocale;

/** en-GB and fr-FR agree on the group separator (NNBSP) but not the decimal mark. */
const decimalMark = () => (activeLocale === 'fr' ? ',' : '.');

/** French typography requires a narrow no-break space before %; English does not. */
export const percentSuffix = () => (activeLocale === 'fr' ? `${NNBSP}%` : '%');

const group = (n, decimals = 0) => {
  const [int, frac] = Math.abs(n).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return `${n < 0 ? '-' : ''}${grouped}${frac ? `${decimalMark()}${frac}` : ''}`;
};

/**
 * @param {number|null|undefined} value
 * @param {'full'|'compact'|'bare'} style
 *   full    "85 000 000 000 FCFA"  tooltips, financial panel, form values, title attributes
 *   compact "85.0bn FCFA"          stat tiles, card lines, table cells
 *   bare    "85.0"                 axis ticks, where the unit is declared once in the axis title
 */
export const formatMoney = (value, style = 'full') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Not set';
  const v = Number(value);

  if (style === 'full') return `${group(v)} FCFA`;

  const abs = Math.abs(v);
  const scaled =
    abs >= 1e9 ? [v / 1e9, 'bn'] : abs >= 1e6 ? [v / 1e6, 'm'] : abs >= 1e3 ? [v / 1e3, 'k'] : [v, ''];
  const [n, suffix] = scaled;
  const digits = suffix ? 1 : 0;

  if (style === 'bare') return group(n, digits);
  return `${group(n, digits)}${suffix} FCFA`;
};

/** Axis and column headers: state the unit once instead of repeating it per value. */
export const moneyScale = (maxValue = 0) => {
  const abs = Math.abs(Number(maxValue) || 0);
  if (abs >= 1e9) return { divisor: 1e9, label: 'FCFA billions' };
  if (abs >= 1e6) return { divisor: 1e6, label: 'FCFA millions' };
  if (abs >= 1e3) return { divisor: 1e3, label: 'FCFA thousands' };
  return { divisor: 1, label: 'FCFA' };
};

/** "12 Mar 2026". Never 12/03/2026: day-month ambiguity in a public record is a real cost. */
export const formatDate = (value) => {
  if (!value) return 'Not set';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not set';
  const tag = activeLocale === 'fr' ? 'fr-FR' : 'en-GB';
  return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
};

/** "3 days ago". The absolute date always travels alongside it in a title attribute. */
export const formatRelative = (value) => {
  if (!value) return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Never';
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(activeLocale === 'fr' ? 'fr-FR' : 'en-GB', { numeric: 'auto' });
  for (const [unit, secs] of units) {
    if (Math.abs(seconds) >= secs) return rtf.format(-Math.round(seconds / secs), unit);
  }
  return 'just now';
};

export const formatPercent = (value) => `${Math.round(Number(value) || 0)}${percentSuffix()}`;

/**
 * @deprecated Use formatMoney(value, 'full'). Kept so unmigrated call sites keep working
 * during the Phase 5 refactor.
 */
export const formatCurrency = (amount) => formatMoney(amount, 'full');

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};
