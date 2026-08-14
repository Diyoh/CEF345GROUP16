import React, { useEffect, useState } from 'react';
import { cn } from './cn';
import { formatMoney } from '../../utils/helpers';
import { useT } from '../../i18n';

/**
 * ProgressMeter: the core component of the product.
 * Spec: docs/design/02-ia-ux.md section 5, docs/design/03-components.md section 6.
 *
 * Answers "80% of the budget is spent and 30% is built" without the reader having to
 * hold one number in memory while looking for the other.
 *
 * Accessibility: the rails are aria-hidden and the figures beside them are real text.
 * A role="meter" with a summarised aria-label would hand a screen reader user OUR
 * interpretation instead of the two numbers a sighted user reads.
 */

const SPEND_TONE = {
  balance: 'bg-neutral-500 dark:bg-neutral-400',
  watch: 'bg-amber-600 dark:bg-amber-300',
  critical: 'bg-red-600 dark:bg-red-400',
  over: 'bg-red-600 dark:bg-red-400',
};

const RAIL = { sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' };

const VARIANCE_TONE = {
  neutral: 'text-fg-tertiary',
  progress: 'text-progress-fg',
  delayed: 'text-delayed-fg',
  over: 'text-over-fg',
};

/** Rails animate from 0 on mount only. Socket updates transition in place. */
const useMountedWidth = (target) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return width;
};

const Rail = ({ value, tone, size, delay = 0, overflow = false }) => {
  const width = useMountedWidth(Math.min(value, 100));
  return (
    <div className={cn('relative w-full overflow-hidden rounded-full bg-sunken', RAIL[size])} aria-hidden="true">
      <div
        className={cn('h-full rounded-full transition-[width] duration-ambient ease-out', tone)}
        style={{ width: `${width}%`, transitionDelay: `${delay}ms` }}
      />
      {/* Over 100% burn the bar caps at the axis end and grows an overflow marker rather
          than being clipped, so the chart never rounds in a flattering direction. */}
      {overflow && <div className="absolute right-0 top-0 h-full w-1 rounded-r-full bg-red-700 dark:bg-red-300" />}
    </div>
  );
};

export const Meter = ({
  health,
  variant = 'dual',
  size = 'md',
  showMoney = true,
  showSentence = false,
  className,
}) => {
  const t = useT();
  if (!health) return null;
  const { progress, burn, burnRounded, variance, varianceTone, band, overBudget, spent, budget } = health;

  const chip = (
    <span className={cn('tabular shrink-0 text-caption font-medium', VARIANCE_TONE[varianceTone] || VARIANCE_TONE.neutral)}>
      {variance > 0 ? '+' : ''}
      {variance} pts
    </span>
  );

  if (variant === 'compact') {
    return (
      <div className={cn('flex min-w-0 flex-col gap-1', className)}>
        <div className={cn('relative w-full overflow-hidden rounded-full bg-sunken', RAIL[size])} aria-hidden="true">
          <div className={cn('h-full rounded-full', SPEND_TONE[band])} style={{ width: `${Math.min(burn, 100)}%` }} />
          {/* Build position as a marker, so one rail carries both variables at table density. */}
          <div
            className="absolute top-0 h-full w-0.5 bg-fg"
            style={{ left: `calc(${Math.min(progress, 100)}% - 1px)` }}
          />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="tabular text-caption text-fg-secondary">
            {Math.round(progress)}% built, {burnRounded}% spent
          </span>
          {chip}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-caption text-fg-tertiary">{t('meter.built')}</span>
          <span className="tabular text-caption font-medium text-fg">{Math.round(progress)}%</span>
        </div>
        <Rail value={progress} tone="bg-accent" size={size} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-caption text-fg-tertiary">{t('meter.spent')}</span>
          <span className="tabular text-caption font-medium text-fg">
            {burnRounded}%
            {showMoney && budget > 0 && (
              <span className="ml-2 font-normal text-fg-tertiary" title={formatMoney(spent, 'full')}>
                {formatMoney(spent, 'compact')}
              </span>
            )}
          </span>
        </div>
        <Rail value={burn} tone={SPEND_TONE[band]} size={size} delay={60} overflow={overBudget} />
      </div>

      <div className="flex items-baseline justify-between gap-3">
        {showSentence ? (
          <p className="text-caption text-fg-secondary">{health.sentence}</p>
        ) : (
          <span className="text-caption text-fg-tertiary">{health.bandLabel}</span>
        )}
        {chip}
      </div>
    </div>
  );
};
