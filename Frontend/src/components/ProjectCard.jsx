import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import { FlagBadges } from './FlagList';
import { useT } from '../i18n';
import { Card, Meter } from './ui';
import { formatMoney, formatRelative } from '../utils/helpers';
import { projectHealth } from '../utils/projectHealth';
import { imageSrc, imageSrcSet, CARD_WIDTHS, SIZES } from '../utils/images';

/**
 * ProjectCard. Spec: docs/design/03-components.md section 4, hierarchy in 02-ia-ux.md 4.1.
 *
 * Reading order the design enforces:
 *   0 cover photo (attention anchor, carries no information, captioned by the title)
 *   1 title            largest text, most space around it
 *   2 badge + variance the only saturated pixels
 *   3 meter            widest element after the photo
 *   4 location, budget
 *   5 updated          lowest contrast in the card
 *
 * Fixes the crash at the old line 10: `project.images.length` was read unconditionally
 * and threw whenever the API returned a project without an images array.
 */
export const ProjectCard = ({ project }) => {
  const t = useT();
  const images = Array.isArray(project.images) ? project.images : [];
  const health = projectHealth(project);
  const cover = images[0] || null;
  const updatedAt = project.updatedAt || project.updated_at || null;

  return (
    <Card as="article" variant="interactive" padding="none" className="group flex h-full flex-col overflow-hidden">
      {/* 16:9 rather than 4:3. The cover carries no information, so it is the first
          thing to give up height when the goal is more projects per screen. */}
      <div className="relative aspect-cover w-full overflow-hidden bg-sunken">
        {cover ? (
          <img
            /* A card is at most ~480px wide, so asking Cloudinary for the original 4000px
               phone photo downloaded roughly 100x more bytes than the box could use. */
            src={imageSrc(cover, 640)}
            srcSet={imageSrcSet(cover, CARD_WIDTHS)}
            sizes={SIZES.card}
            alt=""
            width="800"
            height="600"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-fg-tertiary">
            <i className="fas fa-image text-h2" aria-hidden="true" />
          </div>
        )}

        {/* Every chip over the photo is opaque: the image behind it is whatever the
            contractor uploaded, so nothing here can rely on the backdrop. Short labels
            keep two flags from colliding at this width — the full wording is on the
            project page. */}
        <div className="absolute inset-x-2 top-2 flex flex-wrap justify-end gap-1">
          <StatusBadge project={project} size="sm" showFlags={false} onMedia />
          <FlagBadges flags={project.flags} size="sm" max={2} short onMedia status={project.status} />
        </div>

        {images.length > 1 && (
          <span className="tabular absolute bottom-2 right-2 rounded-sm bg-[rgb(var(--overlay)/0.65)] px-2 py-0.5 text-caption text-white">
            {t('projects.photoCount', { count: images.length })}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="text-h3 text-fg">
          {/* One link, wrapping the title, expanded to the whole card. The accessible name
              is the title and the card is announced once rather than three times. */}
          <Link to={`/project/${project.id}`} className="after:absolute after:inset-0 hover:underline">
            <span className="line-clamp-2">{project.title}</span>
          </Link>
        </h3>

        <p className="mt-1 text-caption text-fg-tertiary">
          {project.location}
          {project.region ? `, ${project.region}` : ''}
        </p>

        {/* mt-auto pins the meter and figures to the bottom, so cards of differing
            title lengths still line their numbers up across a row. */}
        <div className="mt-auto pt-3">
          <Meter health={health} variant="dual" size="md" />
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line-subtle pt-2.5">
          <span className="tabular text-body font-medium text-fg" title={formatMoney(health.budget, 'full')}>
            {formatMoney(health.budget, 'compact')}
          </span>
          <span className="text-caption text-fg-tertiary">
            {updatedAt ? `Updated ${formatRelative(updatedAt)}` : project.contractorName}
          </span>
        </div>
      </div>
    </Card>
  );
};
