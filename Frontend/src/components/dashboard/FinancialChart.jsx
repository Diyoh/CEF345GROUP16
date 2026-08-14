import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { ChartShell, Table, THead, TBody, TH, TR, TD } from '../ui';
import { formatMoney } from '../../utils/helpers';
import { projectHealth, byVarianceAsc } from '../../utils/projectHealth';

/**
 * Budget against spend. Spec: docs/design/04-dataviz.md section 4.1.
 *
 * The previous chart drew grouped vertical bars of Budget and Spent per project. Three
 * problems: grouped bars present the two as sibling categories when spend is a PART of
 * budget; vertical bars gave long project names no room, hence names truncated to 15
 * characters; and with no sort, the projects that need attention landed wherever.
 *
 * Now: one horizontal bar per project showing the share of budget spent, sorted worst
 * first, in the variance band colour. An admin overview should open on the thing that
 * needs a decision.
 */

const BAND_VAR = {
  balance: 'var(--chart-balance)',
  watch: 'var(--chart-watch)',
  critical: 'var(--chart-critical)',
  over: 'var(--chart-critical)',
};

const MAX_ROWS = 8;

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="max-w-[240px] rounded-md border border-line bg-raised p-3 shadow-e3">
      <p className="text-caption font-medium text-fg">{d.fullName}</p>
      <dl className="mt-2 flex flex-col gap-1 text-caption">
        <div className="flex justify-between gap-4">
          <dt className="text-fg-tertiary">Budget</dt>
          <dd className="tabular text-fg">{formatMoney(d.budget, 'full')}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-fg-tertiary">Spent</dt>
          <dd className="tabular text-fg">{formatMoney(d.spent, 'full')}</dd>
        </div>
        <div className="mt-1 flex justify-between gap-4 border-t border-line-subtle pt-1.5">
          <dt className="text-fg-tertiary">Built</dt>
          <dd className="tabular text-fg">{d.progress}%</dd>
        </div>
      </dl>
      <p className="mt-2 text-caption text-fg-tertiary">{d.sentence}</p>
    </div>
  );
};

export const FinancialChart = ({ projects = [] }) => {
  const rows = useMemo(
    () =>
      [...projects]
        .filter((p) => Number(p.budget) > 0)
        .sort(byVarianceAsc)
        .map((p) => {
          const h = projectHealth(p);
          return {
            id: p.id,
            fullName: p.title,
            name: p.title?.length > 28 ? `${p.title.slice(0, 27)}…` : p.title,
            burn: Math.min(Math.round(h.burn), 120),
            burnActual: h.burnRounded,
            progress: Math.round(h.progress),
            variance: h.variance,
            band: h.band,
            budget: h.budget,
            spent: h.spent,
            sentence: h.sentence,
          };
        }),
    [projects]
  );

  const shown = rows.slice(0, MAX_ROWS);
  const overCount = rows.filter((r) => r.band === 'over' || r.band === 'critical').length;

  const dataTable = (
    <Table caption="Budget against spend by project">
      <THead sticky={false}>
        <TR>
          <TH>Project</TH>
          <TH align="right">Budget</TH>
          <TH align="right">Spent</TH>
          <TH align="right">Built</TH>
          <TH align="right">Variance</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((r) => (
          <TR key={r.id}>
            <TD className="text-fg">{r.fullName}</TD>
            <TD align="right">{formatMoney(r.budget, 'compact')}</TD>
            <TD align="right">{formatMoney(r.spent, 'compact')}</TD>
            <TD align="right">{r.progress}%</TD>
            <TD align="right">{r.variance} pts</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );

  return (
    <ChartShell
      title="Budget against spend"
      unit="Share of budget spent, worst first"
      empty={rows.length === 0}
      emptyMessage="No projects with a recorded budget yet."
      table={dataTable}
      caption={
        overCount > 0
          ? `${overCount} of ${rows.length} projects are spending faster than they are building.${
              rows.length > MAX_ROWS ? ` Showing the ${MAX_ROWS} worst.` : ''
            }`
          : `All ${rows.length} projects are tracking their budgets.`
      }
    >
      <div style={{ height: Math.max(shown.length * 34 + 24, 120) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={shown} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }} barSize={12}>
            {/* Horizontal-only gridlines: vertical rules would compete with the bars. */}
            <CartesianGrid horizontal={false} stroke="rgb(var(--line-subtle))" />
            <XAxis
              type="number"
              domain={[0, 120]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgb(var(--fg-tertiary))', fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgb(var(--fg-secondary))', fontSize: 12 }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--sunken))' }} />
            <ReferenceLine x={100} stroke="rgb(var(--line-strong))" strokeDasharray="4 2" />
            <Bar dataKey="burn" radius={[0, 3, 3, 0]} isAnimationActive={false}>
              {shown.map((r) => (
                <Cell key={r.id} fill={BAND_VAR[r.band]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
};
