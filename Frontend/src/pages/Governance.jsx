import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useI18n } from '../i18n';
import { entityName } from '../utils/entities';
import { Card, Badge, EmptyState, Skeleton, SkeletonRegion } from '../components/ui';

/**
 * The public governance browser: which bodies exist, and how much work each one
 * carries. Regions nest their councils; ministries stand alone. Every card links
 * to the entity page, where the body's projects live.
 *
 * Reference data is fetched here rather than kept in the global store: it changes
 * on the timescale of decrees, not sessions, and no other page mutates it.
 */
export const Governance = () => {
  const { t, locale } = useI18n();
  const [tree, setTree] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getEntities()
      .then((res) => {
        if (cancelled) return;
        if (res.success) setTree(res.data);
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-8 md:py-12">
      <div className="mb-8 border-b border-line pb-6">
        <h1 className="text-h1 text-fg">{t('gov.title')}</h1>
        <p className="mt-2 max-w-prose text-body text-fg-secondary">{t('gov.lead')}</p>
      </div>

      {failed ? (
        <EmptyState icon="fa-triangle-exclamation" title={t('gov.notFound')} body={t('gov.notFoundBody')} />
      ) : !tree ? (
        <SkeletonRegion label={t('common.loading')} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </SkeletonRegion>
      ) : (
        <>
          <section aria-labelledby="regions-heading" className="mb-12">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="regions-heading" className="text-h2 text-fg">
                {t('gov.regionsTitle')}
              </h2>
              <p className="text-caption text-fg-tertiary">{t('gov.listNote')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tree.regions.map((region) => (
                <Card key={region.code} variant="interactive" padding="lg" className="flex h-full flex-col">
                  <h3 className="text-h3 text-fg">
                    <Link to={`/entity/${region.code}`} className="after:absolute after:inset-0 hover:underline">
                      {entityName(region, locale)}
                    </Link>
                  </h3>
                  <p className="tabular mt-1 text-caption text-fg-tertiary">
                    {t('gov.councils', { count: region.councils.length })}
                  </p>
                  <p className="tabular mt-auto pt-3 text-body font-medium text-fg">
                    {t('gov.projects', { count: region.projectCount })}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          <section aria-labelledby="ministries-heading">
            <h2 id="ministries-heading" className="mb-5 text-h2 text-fg">
              {t('gov.ministriesTitle')}
            </h2>

            {/* Same structure as the region cards above: two sections of the same
                kind of thing at different shapes read as two different things. */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tree.ministries.map((ministry) => (
                <Card key={ministry.code} variant="interactive" padding="lg" className="flex h-full flex-col">
                  <h3 className="text-h3 leading-snug text-fg">
                    <Link to={`/entity/${ministry.code}`} className="after:absolute after:inset-0 hover:underline">
                      {entityName(ministry, locale)}
                    </Link>
                  </h3>
                  <p className="mt-1">
                    <Badge tone="neutral" size="sm" className="font-mono">
                      {ministry.code}
                    </Badge>
                  </p>
                  <p className="tabular mt-auto pt-3 text-body font-medium text-fg">
                    {t('gov.projects', { count: ministry.projectCount })}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
