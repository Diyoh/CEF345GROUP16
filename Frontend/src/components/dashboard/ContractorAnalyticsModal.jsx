import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../useAppStore';
import { StatusBadge } from '../StatusBadge';
import { Modal, StatTile, Table, THead, TBody, TH, TR, TD, TableEmpty, Meter, Skeleton, EmptyState } from '../ui';
import { formatMoney } from '../../utils/helpers';
import { projectHealth } from '../../utils/projectHealth';

/**
 * Contractor analytics. Spec: docs/design/04-dataviz.md section 4.3.
 *
 * The four tiles used to be blue, green, orange and purple: four tiles, so four colours,
 * two of them outside the palette. Colour is the encoding channel in this system, so the
 * tiles are now neutral and the only coloured element is the one that carries a judgement.
 */
export const ContractorAnalyticsModal = ({ contractorId, onClose }) => {
  const { fetchContractorStats } = useAppStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contractorId) return;
    setLoading(true);
    fetchContractorStats(contractorId).then((statsData) => {
      setData(statsData);
      setLoading(false);
    });
  }, [contractorId]);

  const projects = data?.projects || [];
  const atRisk = projects.filter((p) => {
    const h = projectHealth(p);
    return h.overBudget || h.band === 'critical';
  }).length;

  return (
    <Modal
      isOpen={Boolean(contractorId)}
      onClose={onClose}
      size="lg"
      title={loading ? 'Loading' : `${data?.contractor?.name || 'Contractor'}`}
      description={loading ? undefined : 'Portfolio summary and current projects'}
    >
      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !data ? (
        <EmptyState icon="fa-triangle-exclamation" title="Could not load this contractor" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Projects" value={data.stats.totalProjects} />
            <StatTile
              label="Total budget"
              value={formatMoney(data.stats.totalBudget, 'compact')}
              exact={formatMoney(data.stats.totalBudget, 'full')}
            />
            <StatTile
              label="Total spent"
              value={formatMoney(data.stats.totalSpent, 'compact')}
              exact={formatMoney(data.stats.totalSpent, 'full')}
              delta={
                data.stats.totalBudget > 0
                  ? `${Math.round((data.stats.totalSpent / data.stats.totalBudget) * 100)}%`
                  : undefined
              }
              deltaTone={
                data.stats.totalSpent > data.stats.totalBudget ? 'negative' : 'neutral'
              }
            />
            <StatTile
              label="Average progress"
              value={`${Math.round(data.stats.avgProgress)}%`}
              delta={atRisk > 0 ? `${atRisk} at risk` : undefined}
              deltaTone={atRisk > 0 ? 'negative' : 'neutral'}
            />
          </div>

          <h3 className="mb-3 mt-8 text-h3 text-fg">Current projects</h3>
          <Table caption={`Projects assigned to ${data?.contractor?.name}`}>
            <THead sticky={false}>
              <TR>
                <TH>Project</TH>
                <TH width="140px">Status</TH>
                <TH width="180px">Build vs spend</TH>
                <TH align="right">Budget</TH>
              </TR>
            </THead>
            <TBody>
              {projects.length === 0 ? (
                <TableEmpty colSpan={4}>No projects assigned.</TableEmpty>
              ) : (
                projects.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium text-fg">{p.title}</TD>
                    <TD>
                      <StatusBadge project={p} size="sm" />
                    </TD>
                    <TD>
                      <Meter health={projectHealth(p)} variant="compact" size="sm" />
                    </TD>
                    <TD align="right" title={formatMoney(p.budget, 'full')}>
                      {formatMoney(p.budget, 'compact')}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </>
      )}
    </Modal>
  );
};
