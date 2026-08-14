import React, { useEffect, useMemo } from 'react';
import { useAppStore } from '../../useAppStore';
import { Table, THead, TBody, TH, TR, TD, TableEmpty, Button } from '../ui';
import { formatMoney } from '../../utils/helpers';
import { projectHealth } from '../../utils/projectHealth';
import { useT } from '../../i18n';

/**
 * Registered contractors. Adds the portfolio figures the admin needed the analytics modal
 * to answer: how many projects, how much money, and how many of them are in trouble.
 */
export const ContractorList = ({ onSelect }) => {
  const t = useT();
  const { contractors, fetchContractors, projects } = useAppStore();

  useEffect(() => {
    fetchContractors();
  }, []);

  const stats = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => {
      const id = p.contractorId || p.contractor_id;
      if (!id) return;
      const current = map.get(id) || { count: 0, budget: 0, atRisk: 0 };
      const h = projectHealth(p);
      current.count += 1;
      current.budget += h.budget;
      if (h.overBudget || h.band === 'critical') current.atRisk += 1;
      map.set(id, current);
    });
    return map;
  }, [projects]);

  return (
    <Table caption={t('admin.contractorsCaption')}>
      <THead>
        <TR>
          <TH>{t('projects.contractor')}</TH>
          <TH className="hidden md:table-cell">{t('admin.email')}</TH>
          <TH align="right">{t('admin.projects')}</TH>
          <TH align="right" className="hidden sm:table-cell">
            {t('admin.portfolioValue')}
          </TH>
          <TH align="right">
            <span className="sr-only">{t('admin.actions')}</span>
          </TH>
        </TR>
      </THead>
      <TBody>
        {contractors.length === 0 ? (
          <TableEmpty colSpan={5}>{t('admin.noContractors')}</TableEmpty>
        ) : (
          contractors.map((contractor) => {
            const s = stats.get(contractor.id) || { count: 0, budget: 0, atRisk: 0 };
            return (
              <TR key={contractor.id}>
                <TD className="font-medium text-fg">
                  {contractor.name}
                  {s.atRisk > 0 && (
                    <span className="mt-0.5 block text-caption text-over-fg">
                      {t('admin.atRisk', { count: s.atRisk })}
                    </span>
                  )}
                </TD>
                <TD className="hidden md:table-cell">{contractor.email}</TD>
                <TD align="right">{s.count}</TD>
                <TD align="right" className="hidden sm:table-cell" title={formatMoney(s.budget, 'full')}>
                  {formatMoney(s.budget, 'compact')}
                </TD>
                <TD align="right">
                  <Button variant="ghost" size="xs" onClick={() => onSelect(contractor.id)}>
                    {t('admin.analytics')}
                  </Button>
                </TD>
              </TR>
            );
          })
        )}
      </TBody>
    </Table>
  );
};
