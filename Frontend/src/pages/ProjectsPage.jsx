import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../useAppStore';
import { csvExportUrl } from '../api';
import { ProjectCard } from '../components/ProjectCard';
import { Button, Card, Select, EmptyState, Badge, Skeleton, SkeletonRegion } from '../components/ui';
import { ProjectStatus } from '../types';
import { projectHealth, byVarianceAsc } from '../utils/projectHealth';

/**
 * The one browse surface. Spec: docs/design/02-ia-ux.md section 3.1.
 *
 * Filter state lives in the URL. A filtered view that cannot be linked cannot be shared,
 * and sharing a link is how citizen journalism actually spreads. Every filter change
 * writes a query string, so any view a citizen finds is a URL they can send to someone.
 */

const SORTS = {
  attention: { label: 'Needs attention first', fn: byVarianceAsc },
  budget: { label: 'Largest budget', fn: (a, b) => (Number(b.budget) || 0) - (Number(a.budget) || 0) },
  progress: { label: 'Most complete', fn: (a, b) => (Number(b.progress) || 0) - (Number(a.progress) || 0) },
};

export const ProjectsPage = () => {
  const { projects, loading } = useAppStore();
  const [params, setParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const search = params.get('q') || '';
  const statusFilter = params.get('status') || 'All';
  const regionFilter = params.get('region') || 'All';
  const contractorFilter = params.get('contractor') || 'All';
  const sort = params.get('sort') || 'attention';

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'All') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  const regions = useMemo(() => {
    const unique = new Set(projects.map((p) => p.region).filter(Boolean));
    return ['All', ...Array.from(unique)];
  }, [projects]);

  const contractors = useMemo(() => {
    const unique = new Map();
    projects.forEach((p) => {
      const id = p.contractorId || p.contractor_id;
      if (id && p.contractorName && !unique.has(id)) unique.set(id, p.contractorName);
    });
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const term = search.toLowerCase();
    return projects
      .filter((p) => {
        const matchesSearch =
          !term ||
          p.title?.toLowerCase().includes(term) ||
          p.location?.toLowerCase().includes(term);
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        const matchesRegion = regionFilter === 'All' || p.region === regionFilter;
        const matchesContractor =
          contractorFilter === 'All' ||
          p.contractorId === contractorFilter ||
          p.contractor_id === contractorFilter;
        return matchesSearch && matchesStatus && matchesRegion && matchesContractor;
      })
      .sort(SORTS[sort]?.fn || SORTS.attention.fn);
  }, [projects, search, statusFilter, regionFilter, contractorFilter, sort]);

  const activeFilters = [
    statusFilter !== 'All' && { key: 'status', label: statusFilter },
    regionFilter !== 'All' && { key: 'region', label: regionFilter },
    contractorFilter !== 'All' && {
      key: 'contractor',
      label: contractors.find((c) => c.id === contractorFilter)?.name || 'Contractor',
    },
    search && { key: 'q', label: `"${search}"` },
  ].filter(Boolean);

  const attentionCount = useMemo(
    () => projects.filter((p) => projectHealth(p).band === 'critical' || projectHealth(p).overBudget).length,
    [projects]
  );

  // Mobile filter sheet locks background scroll, same contract as the nav menu.
  useEffect(() => {
    if (!isFilterOpen) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isFilterOpen]);

  const filterControls = (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor="filter-search" className="mb-1.5 block text-caption font-medium text-fg-secondary">
          Search
        </label>
        <input
          id="filter-search"
          type="search"
          value={search}
          onChange={(e) => setParam('q', e.target.value)}
          placeholder="Project name or town"
          className="h-10 w-full rounded-sm border border-input bg-canvas px-3 text-body text-fg placeholder:text-fg-placeholder dark:bg-sunken"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-caption font-medium text-fg-secondary">Status</legend>
        <div className="flex flex-col gap-1">
          {['All', ...Object.values(ProjectStatus)].map((status) => (
            <label
              key={status}
              className="flex cursor-pointer items-center gap-2.5 rounded-sm px-1 py-1.5 hover:bg-sunken"
            >
              <input
                type="radio"
                name="status"
                value={status}
                checked={statusFilter === status}
                onChange={() => setParam('status', status)}
                className="h-4 w-4 accent-[rgb(var(--accent))]"
              />
              <span className={statusFilter === status ? 'text-body text-fg' : 'text-body text-fg-secondary'}>
                {status}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Select label="Region" value={regionFilter} onChange={(e) => setParam('region', e.target.value)}>
        {regions.map((r) => (
          <option key={r} value={r}>
            {r === 'All' ? 'All regions' : r}
          </option>
        ))}
      </Select>

      <Select
        label="Contractor"
        value={contractorFilter}
        onChange={(e) => setParam('contractor', e.target.value)}
      >
        <option value="All">All contractors</option>
        {contractors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-8 md:py-12">
      <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-h1 text-fg">Public infrastructure projects</h1>
          <p className="mt-2 max-w-prose text-body text-fg-secondary">
            {projects.length} projects across Cameroon.
            {attentionCount > 0 && ` ${attentionCount} are spending faster than they are building.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            aria-label="Sort projects"
            size="sm"
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            fieldClassName="w-full md:w-56"
          >
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </Select>
          {/* Anyone can take the data away and check it against another source. That is the
              point of a transparency platform: the filters travel with the download, so what
              you export is what you were looking at. */}
          <Button
            as="a"
            href={csvExportUrl({ status: statusFilter, region: regionFilter, search })}
            variant="ghost"
            size="md"
            className="hidden sm:inline-flex"
            leadingIcon={<i className="fas fa-file-csv" aria-hidden="true" />}
            title="Download these projects as a spreadsheet"
          >
            Export
          </Button>

          <Button
            variant="secondary"
            size="md"
            className="md:hidden"
            onClick={() => setIsFilterOpen(true)}
            leadingIcon={<i className="fas fa-sliders" aria-hidden="true" />}
          >
            Filters
            {activeFilters.length > 0 && <span className="tabular ml-1">({activeFilters.length})</span>}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="hidden w-64 shrink-0 lg:sticky lg:top-24 lg:block">
          <Card padding="lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-h3 text-fg">Filters</h2>
              {activeFilters.length > 0 && (
                <Button variant="link" size="sm" onClick={clearAll}>
                  Clear all
                </Button>
              )}
            </div>
            {filterControls}
          </Card>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="tabular text-caption text-fg-tertiary">
              {filteredProjects.length} of {projects.length} projects
            </p>
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setParam(f.key, null)}
                aria-label={`Remove filter ${f.label}`}
                className="rounded-full"
              >
                <Badge tone="neutral" size="sm" icon={<i className="fas fa-xmark" />}>
                  {f.label}
                </Badge>
              </button>
            ))}
          </div>

          {loading ? (
            <SkeletonRegion label="Loading projects" className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} padding="none" className="overflow-hidden">
                  <Skeleton className="aspect-photo w-full rounded-none" />
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </Card>
              ))}
            </SkeletonRegion>
          ) : filteredProjects.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon="fa-folder-open"
              title="No projects published yet"
              body="Once a project is created it appears here for everyone to follow."
            />
          ) : (
            <EmptyState
              icon="fa-filter-circle-xmark"
              title="No projects match these filters"
              body="Try a broader search, or clear the filters to see everything."
              action={
                <Button variant="primary" onClick={clearAll}>
                  Clear filters
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <div
            className="absolute inset-0 bg-[rgb(var(--overlay)/0.55)] animate-fade-in"
            onClick={() => setIsFilterOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter projects"
            className="relative z-10 max-h-[85vh] overflow-y-auto rounded-t-xl bg-raised p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-e4 animate-sheet-up"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-h3 text-fg">Filters</h2>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={() => setIsFilterOpen(false)}
                aria-label="Close filters"
                leadingIcon={<i className="fas fa-xmark" aria-hidden="true" />}
              />
            </div>
            {filterControls}
            <div className="mt-6 flex gap-3">
              <Button variant="ghost" size="lg" fullWidth onClick={clearAll}>
                Clear all
              </Button>
              <Button variant="primary" size="lg" fullWidth onClick={() => setIsFilterOpen(false)}>
                Show {filteredProjects.length} projects
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
