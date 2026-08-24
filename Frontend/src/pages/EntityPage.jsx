import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useI18n } from '../i18n';
import { entityName, entityTypeKey } from '../utils/entities';
import { ProjectCard } from '../components/ProjectCard';
import { Card, Badge, EmptyState, Skeleton, SkeletonRegion } from '../components/ui';

/**
 * One institution's public page: what it is, where it sits in the hierarchy, and
 * every project it owns or that covers its territory. A region page rolls its
 * councils in, because "work in the North-West" includes what its councils
 * commissioned. From phase G3 this page also carries the body's money.
 */
export const EntityPage = () => {
  const { code } = useParams();
  const { t, locale } = useI18n();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setFailed(false);
    api.getEntity(code)
      .then((res) => {
        if (cancelled) return;
        if (res.success) setData(res.data);
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (failed) {
    return (
      <div className="mx-auto max-w-content px-4 py-16 md:px-8">
        <EmptyState
          icon="fa-landmark"
          title={t('gov.notFound')}
          body={t('gov.notFoundBody')}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-content px-4 py-8 md:px-8 md:py-12">
        <SkeletonRegion label={t('common.loading')}>
          <Skeleton className="h-9 w-72" />
          <Skeleton className="mt-3 h-5 w-96" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        </SkeletonRegion>
      </div>
    );
  }

  const { entity, parent, children, projects } = data;
  const showParentCrumb = parent && parent.type !== 'NATIONAL';

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-8 md:py-12">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-caption text-fg-tertiary">
          <li>
            <Link to="/governance" className="hover:text-fg">
              {t('gov.backToGov')}
            </Link>
          </li>
          {showParentCrumb && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link to={`/entity/${parent.code}`} className="hover:text-fg">
                  {entityName(parent, locale)}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li className="truncate text-fg-secondary">{entityName(entity, locale)}</li>
        </ol>
      </nav>

      <header className="mb-8 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 text-h1 text-fg">{entityName(entity, locale)}</h1>
          <Badge tone="planned" size="md">
            {t(entityTypeKey(entity.type))}
          </Badge>
        </div>
        <p className="tabular mt-2 text-caption text-fg-tertiary">
          {entity.code}
          {projects && ` · ${t('gov.projects', { count: projects.length })}`}
        </p>
      </header>

      {entity.type === 'REGION' && children.length > 0 && (
        <section aria-labelledby="councils-heading" className="mb-10">
          <h2 id="councils-heading" className="mb-4 text-h2 text-fg">
            {t('gov.childCouncilsTitle')}
          </h2>
          <Card padding="lg">
            <ul className="flex flex-wrap gap-2">
              {children.map((council) => (
                <li key={council.code}>
                  <Link
                    to={`/entity/${council.code}`}
                    className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-caption text-fg-secondary hover:bg-sunken hover:text-fg"
                  >
                    {entityName(council, locale)}
                    {council.projectCount > 0 && (
                      <span className="tabular text-fg-tertiary">{council.projectCount}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section aria-labelledby="entity-projects-heading">
        <h2 id="entity-projects-heading" className="mb-5 text-h2 text-fg">
          {t('gov.entityProjectsTitle')}
        </h2>

        {projects.length === 0 ? (
          <EmptyState
            icon="fa-folder-open"
            title={t('gov.noEntityProjects')}
            body={t('gov.noEntityProjectsBody')}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
