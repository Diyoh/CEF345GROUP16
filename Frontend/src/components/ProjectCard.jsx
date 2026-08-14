import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import { FlagBadges } from './FlagList';
import { Card, Meter } from './ui';
import { formatMoney, formatRelative } from '../utils/helpers';
import { projectHealth } from '../utils/projectHealth';

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
  const images = Array.isArray(project.images) ? project.images : [];
  const health = projectHealth(project);
  const cover = images[0] || null;
  const updatedAt = project.updatedAt || project.updated_at || null;

  return (
    <Card as="article" variant="interactive" padding="none" className="group flex h-full flex-col overflow-hidden">
      <div className="relative aspect-photo w-full overflow-hidden bg-sunken">
        {cover ? (
          <img
            src={cover}
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

        <div className="absolute right-2 top-2 flex max-w-[85%] flex-wrap justify-end gap-1">
          <StatusBadge project={project} size="sm" showFlags={false} />
          {/* Server-computed anomalies. Capped at two so a badly-off project does not turn
              the card into a wall of red. */}
          <FlagBadges flags={project.flags} size="sm" max={2} />
        </div>

        {images.length > 1 && (
          <span className="tabular absolute bottom-2 right-2 rounded-sm bg-[rgb(var(--overlay)/0.65)] px-2 py-0.5 text-caption text-white">
            {images.length} photos
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
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

        <div className="mt-4">
          <Meter health={health} variant="dual" size="md" />
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line-subtle pt-3">
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
