import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { en } from './en';
import { fr } from './fr';
import { setFormatLocale } from '../utils/helpers';

/**
 * BILINGUAL SUPPORT — English and French
 *
 * Cameroon has two official languages and the francophone regions are the majority. An
 * English-only public accountability record excludes most of the country it claims to serve,
 * so this is a correctness requirement, not a feature.
 *
 * WHY NOT react-i18next:
 * It is the right default in most projects and would be roughly 40KB gzipped here. This app
 * targets metered mobile connections in Cameroon, has exactly two locales, no runtime locale
 * loading and no pluralisation beyond one/other — so that is 40KB spent on machinery none of
 * it is needed. This module is under 2KB and does the four things that are actually required:
 * lookup with fallback, interpolation, one/other plurals, and persistence.
 *
 * If a third locale or real CLDR plural rules ever arrive, replace this wholesale rather than
 * growing it. The `t()` call sites are library-agnostic on purpose.
 */

const LOCALES = { en, fr };
export const SUPPORTED_LOCALES = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'fr', label: 'Français', short: 'FR' },
];

const STORAGE_KEY = 'br-locale';

/**
 * Order: explicit choice, then browser preference, then English.
 * A francophone visitor should land on French without touching anything — asking them to
 * find a switcher first is the same exclusion in a smaller form.
 */
const detectLocale = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && LOCALES[stored]) return stored;
    } catch {
        /* Safari private mode throws on localStorage; fall through to detection. */
    }

    if (typeof navigator !== 'undefined') {
        const langs = navigator.languages || [navigator.language];
        for (const lang of langs) {
            const base = String(lang || '').slice(0, 2).toLowerCase();
            if (LOCALES[base]) return base;
        }
    }

    return 'en';
};

/** Resolves "a.b.c" against a nested dictionary. */
const lookup = (dict, key) =>
    key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dict);

/** Replaces {name} placeholders. Values are inserted as text, never as markup. */
const interpolate = (template, params) =>
    template.replace(/\{(\w+)\}/g, (match, name) =>
        Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
    );

const I18nContext = createContext(undefined);

export const I18nProvider = ({ children, initialLocale }) => {
    const [locale, setLocaleState] = useState(() => initialLocale || detectLocale());

    // `lang` must track the locale: screen readers switch pronunciation from it, and it is
    // what tells a browser whether to offer translation.
    //
    // The number/date formatters are synced here too. They are shared module state rather
    // than context, so this is the single place that keeps "85.0bn" / "85,0bn" and
    // "12 Mar 2026" / "12 mars 2026" in step with the interface language.
    useEffect(() => {
        if (typeof document !== 'undefined') document.documentElement.lang = locale;
        setFormatLocale(locale);
    }, [locale]);

    // Also set it during the first render, before any effect runs, so the initial paint is
    // not briefly formatted in the wrong locale.
    setFormatLocale(locale);

    const setLocale = useCallback((next) => {
        if (!LOCALES[next]) return;
        setLocaleState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* Preference simply will not persist; the app still works. */
        }
    }, []);

    /**
     * t(key, params)
     *
     * Falls back to English, then to the key itself. A missing translation must degrade to
     * readable English rather than rendering "undefined" at a citizen — a half-translated
     * page is usable, a broken one is not.
     *
     * Pluralisation: pass `count` and define `key_one` / `key_other`. Both English and French
     * use two forms for the cases here; French treats 0 as singular, which `count <= 1`
     * handles for fr and is harmless for en where 0 uses the plural form.
     */
    const t = useCallback(
        (key, params = {}) => {
            const dict = LOCALES[locale] || en;

            let template;
            if (Object.prototype.hasOwnProperty.call(params, 'count')) {
                const isSingular = locale === 'fr' ? params.count <= 1 : params.count === 1;
                const suffix = isSingular ? '_one' : '_other';
                template = lookup(dict, key + suffix) ?? lookup(en, key + suffix);
            }

            template = template ?? lookup(dict, key) ?? lookup(en, key);

            if (typeof template !== 'string') {
                if (import.meta.env.DEV) console.warn(`[i18n] missing translation: ${key}`);
                return key;
            }

            return interpolate(template, params);
        },
        [locale]
    );

    const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
    const context = useContext(I18nContext);
    if (!context) throw new Error('useI18n must be used within I18nProvider');
    return context;
};

/** Convenience for the common case of needing only the translator. */
export const useT = () => useI18n().t;
