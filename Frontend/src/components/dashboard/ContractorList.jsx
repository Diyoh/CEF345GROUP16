import React, { useEffect, useMemo } from 'react';
import { useAppStore } from '../../useAppStore';
import { Table, THead, TBody, TH, TR, TD, TableEmpty, Button } from '../ui';
import { formatMoney } from '../../utils/helpers';
import { projectHealth } from '../../utils/projectHealth';

/**
 * Registered contractors. Adds the portfolio figures the admin needed the analytics modal
 * to answer: how many projects, how much money, and how many of them are in trouble.
 */
export const ContractorList = ({ onSelect }) => {
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
    <Table caption="Registered contractors and their portfolios">
      <THead>
        <TR>
          <TH>Contractor</TH>
          <TH className="hidden md:table-cell">Email</TH>
          <TH align="right">Projects</TH>
          <TH align="right" className="hidden sm:table-cell">
            Portfolio value
          </TH>
          <TH align="right">
            <span className="sr-only">Actions</span>
          </TH>
        </TR>
      </THead>
      <TBody>
        {contractors.length === 0 ? (
          <TableEmpty colSpan={5}>No contractors registered yet.</TableEmpty>
        ) : (
          contractors.map((contractor) => {
            const s = stats.get(contractor.id) || { count: 0, budget: 0, atRisk: 0 };
            return (
              <TR key={contractor.id}>
                <TD className="font-medium text-fg">
                  {contractor.name}
                  {s.atRisk > 0 && (
                    <span className="mt-0.5 block text-caption text-over-fg">
                      {s.atRisk} project{s.atRisk > 1 ? 's' : ''} at risk
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
                    Analytics
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
