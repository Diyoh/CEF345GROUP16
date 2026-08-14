import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../StatusBadge';
import { Table, THead, TBody, TH, TR, TD, TableEmpty, Button, Meter, Card } from '../ui';
import { formatMoney, formatRelative } from '../../utils/helpers';
import { projectHealth } from '../../utils/projectHealth';
import { useT } from '../../i18n';

/**
 * Project table. Spec: docs/design/02-ia-ux.md section 7.
 *
 * Column priority: Project and Status always; Build vs Spend and Budget from md;
 * Contractor from lg; Updated from xl. Below md the table becomes a stacked list rather
 * than a horizontal scroll, because scrolling sideways hides the columns that matter and
 * destroys the row as a readable unit.
 */
export const ProjectTable = ({ projects, onEdit }) => {
  const t = useT();
  if (projects.length === 0) {
    return (
      <Table caption={t('admin.projects')}>
        <THead>
          <TR>
            <TH>{t('project.tableProject')}</TH>
          </TR>
        </THead>
        <TBody>
          <TableEmpty colSpan={1}>{t('project.tableNoProjects')}</TableEmpty>
        </TBody>
      </Table>
    );
  }

  return (
    <>
      {/* Desktop and tablet */}
      <div className="hidden md:block">
        <Table caption={t('project.tableCaption')}>
          <THead>
            <TR>
              <TH width="32%">{t('project.tableProject')}</TH>
              <TH width="150px">{t('projects.status')}</TH>
              <TH width="200px">{t('project.tableBuildVsSpend')}</TH>
              <TH align="right" width="140px">
                Budget
              </TH>
              <TH className="hidden lg:table-cell">{t('projects.contractor')}</TH>
              <TH className="hidden xl:table-cell">Updated</TH>
              <TH align="right" width="80px">
                <span className="sr-only">Actions</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {projects.map((p) => {
              const health = projectHealth(p);
              const updatedAt = p.updatedAt || p.updated_at;
              return (
                <TR key={p.id}>
                  <TD className="text-fg">
                    <Link to={`/project/${p.id}`} className="font-medium text-fg hover:underline">
                      {p.title}
                    </Link>
                    <span className="mt-0.5 block text-caption text-fg-tertiary">
                      {p.location}
                      {p.region ? `, ${p.region}` : ''}
                    </span>
                  </TD>
                  <TD>
                    <StatusBadge project={p} size="sm" />
                  </TD>
                  <TD>
                    <Meter health={health} variant="compact" size="sm" />
                  </TD>
                  <TD align="right">
                    <span className="block text-fg" title={formatMoney(health.budget, 'full')}>
                      {formatMoney(health.budget, 'compact')}
                    </span>
                    <span className="block text-caption text-fg-tertiary">
                      {formatMoney(health.spent, 'compact')} spent
                    </span>
                  </TD>
                  <TD className="hidden max-w-[180px] truncate lg:table-cell" title={p.contractorName}>
                    {p.contractorName || 'Unassigned'}
                  </TD>
                  <TD className="hidden text-caption text-fg-tertiary xl:table-cell">
                    {updatedAt ? formatRelative(updatedAt) : 'Not recorded'}
                  </TD>
                  <TD align="right">
                    <Button
                      variant="ghost"
                      size="xs"
                      iconOnly
                      onClick={() => onEdit(p)}
                      aria-label={`Edit ${p.title}`}
                      leadingIcon={<i className="fas fa-pen" aria-hidden="true" />}
                    />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>

      {/* Mobile: the same hierarchy as a stacked list */}
      <ul className="flex flex-col gap-3 md:hidden">
        {projects.map((p) => {
          const health = projectHealth(p);
          return (
            <li key={p.id}>
              <Card padding="sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/project/${p.id}`} className="text-body font-medium text-fg hover:underline">
                      {p.title}
                    </Link>
                    <p className="mt-0.5 text-caption text-fg-tertiary">{p.location}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => onEdit(p)}
                    aria-label={`Edit ${p.title}`}
                    leadingIcon={<i className="fas fa-pen" aria-hidden="true" />}
                  />
                </div>
                <div className="mt-3">
                  <StatusBadge project={p} size="sm" />
                </div>
                <div className="mt-3">
                  <Meter health={health} variant="compact" size="md" />
                </div>
                <p className="tabular mt-3 border-t border-line-subtle pt-2 text-caption text-fg-tertiary">
                  {formatMoney(health.spent, 'compact')} of {formatMoney(health.budget, 'compact')}
                </p>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
};
