import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useI18n } from '../i18n';
import { Button, Badge } from './ui';

/**
 * "Ask in plain words" for the Projects page.
 *
 * The AI only chooses filters; the page then lists the real projects those
 * filters match. What it chose is shown as chips, labelled as the assistant's
 * reading of the question, so a wrong guess is visible and can be undone with
 * the ordinary filter controls. Renders nothing when no model is available.
 */

const SORT_LABEL_KEYS = {
  attention: 'projects.sortAttention',
  budget: 'projects.sortBudget',
  progress: 'projects.sortProgress',
};

export const AiSearch = ({ onApply }) => {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.getAiStatus()
      .then((res) => !cancelled && res?.success && setStatus(res.data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status?.enabled) return null;

  const chipLabel = ({ key, value, label }) => {
    if (key === 'status') return t(`status.${value}`);
    if (key === 'sort') return t(SORT_LABEL_KEYS[value]);
    if (key === 'q') return t('projects.aiText', { text: value });
    return label || value;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (query.trim().length < 3 || busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await api.aiSearch(query.trim(), locale);
      if (!res?.success) throw new Error(res?.error);
      setResult(res.data);
      onApply(res.data.filters);
    } catch {
      // The server's reason is English-only and meant for the operator's log.
      setError(t('projects.aiFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="ai-search-heading" className="mb-8 rounded-lg border border-line bg-surface p-4 md:p-5">
      <h2 id="ai-search-heading" className="text-h3 text-fg">
        <i className="fas fa-wand-magic-sparkles mr-2 text-fg-tertiary" aria-hidden="true" />
        {t('projects.aiTitle')}
      </h2>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="ai-search-input" className="sr-only">
          {t('projects.aiTitle')}
        </label>
        <input
          id="ai-search-input"
          type="search"
          value={query}
          maxLength={300}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('projects.aiPlaceholder')}
          className="min-w-0 flex-1 rounded-md border border-line bg-canvas px-3 py-2 text-body text-fg placeholder:text-fg-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <Button type="submit" variant="primary" size="md" loading={busy} disabled={query.trim().length < 3}>
          {t('projects.aiAsk')}
        </Button>
      </form>

      <div role="status" aria-live="polite" className="mt-3 text-caption text-fg-secondary">
        {busy && t('projects.aiThinking')}
        {error && <span className="text-over-fg">{error}</span>}
        {result && (
          <div className="flex flex-wrap items-center gap-2">
            <span>{result.applied.length ? t('projects.aiApplied') : t('projects.aiNothing')}</span>
            {result.applied.map((f) => (
              <Badge key={`${f.key}-${f.value}`} tone="neutral" size="sm">
                {chipLabel(f)}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 text-caption text-fg-tertiary">
        {t('projects.aiDisclaimer', { model: status.model })}
      </p>
    </section>
  );
};
