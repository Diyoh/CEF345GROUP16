import React, { useMemo, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../useAppStore';
import { PageHeader } from '../../components/layout/AdminLayout';
import { StatTile, Card, Button, EmptyState, Meter, Skeleton } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import { formatMoney } from '../../utils/helpers';
import { projectHealth, byVarianceAsc } from '../../utils/projectHealth';

/**
 * Admin overview. Answers "what needs a decision today" before anything else.
 *
 * The chart is lazy-loaded so Recharts never reaches the public portal bundle. The public
 * surface has the 3G users and needs no charts at all, so shipping the library to them is
 * a cost with no return.
 */
const FinancialChart = lazy(() =>
  import('../../components/dashboard/FinancialChart').then((m) => ({ default: m.FinancialChart }))
);
export const AdminOverview = () => {
  const { projects, comments } = useAppStore();

  const totals = useMemo(() => {
    const budget = projects.reduce((a, p) => a + (Number(p.budget) || 0), 0);
    const spent = projects.reduce((a, p) => a + (Number(p.spent) || 0), 0);
    const atRisk = projects.filter((p) => {
      const h = projectHealth(p);
      return h.overBudget || h.band === 'critical';
    }).length;
    return { budget, spent, atRisk };
  }, [projects]);

  const attention = useMemo(() => [...projects].sort(byVarianceAsc).slice(0, 5), [projects]);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Portfolio health across every tracked project."
        actions={
          <Button as={Link} to="/admin/projects" variant="primary" size="md">
            Manage projects
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Projects" value={projects.length} />
        <StatTile
          label="Total budget"
          value={formatMoney(totals.budget, 'compact')}
          exact={formatMoney(totals.budget, 'full')}
        />
        <StatTile
          label="Total spent"
          value={formatMoney(totals.spent, 'compact')}
          exact={formatMoney(totals.spent, 'full')}
          delta={totals.budget > 0 ? `${Math.round((totals.spent / totals.budget) * 100)}%` : undefined}
          deltaTone={totals.spent > totals.budget ? 'negative' : 'neutral'}
        />
        <StatTile
          label="Needing attention"
          value={totals.atRisk}
          delta={totals.atRisk > 0 ? 'Review' : 'Clear'}
          deltaTone={totals.atRisk > 0 ? 'negative' : 'neutral'}
          hint="Over budget or spending well ahead of build"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Suspense fallback={<Skeleton className="h-[360px] w-full rounded-lg" />}>
            <FinancialChart projects={projects} />
          </Suspense>
        </div>

        <Card padding="lg">
          <h2 className="text-h3 text-fg">Worst variance</h2>
          <p className="mt-1 text-caption text-fg-tertiary">Build percentage minus spend percentage.</p>

          {attention.length === 0 ? (
            <EmptyState className="mt-4" icon="fa-folder-open" title="No projects yet" />
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-line-subtle">
              {attention.map((p) => (
                <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/project/${p.id}`} className="text-body font-medium text-fg hover:underline">
                      {p.title}
                    </Link>
                    <StatusBadge project={p} size="sm" showFlags={false} />
                  </div>
                  <div className="mt-2">
                    <Meter health={projectHealth(p)} variant="compact" size="sm" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Button as={Link} to="/admin/reports" variant="ghost" size="sm" className="mt-4">
            {comments.length} citizen report{comments.length === 1 ? '' : 's'} to review
          </Button>
        </Card>
      </div>
    </>
  );
};
