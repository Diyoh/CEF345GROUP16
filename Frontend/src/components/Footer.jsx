import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../useAppStore';
import { formatDate } from '../utils/helpers';

/**
 * Footer. Spec: docs/design/03-components.md section 13.
 *
 * The provenance block answers "where does this data come from and how current is it" in
 * the same place on every page, which buys more trust than any visual treatment.
 *
 * Corrections after seeing it rendered:
 *  - "Last updated" now reads the newest project timestamp instead of printing today's
 *    date. Rendering new Date() there claimed the record was updated today whether or not
 *    anything changed, which is exactly the kind of small overstatement a transparency
 *    product cannot afford in the block whose entire job is provenance.
 *  - The label/value pairs were justify-between across a 480px column, which stranded the
 *    value at the far right with a void in the middle and broke the association between
 *    them. They are stacked now.
 *  - The three columns were equal thirds while the content was nothing like equal, so the
 *    short link list held as much width as the provenance table. The grid is now weighted
 *    to the content.
 */
export const Footer = () => {
  const { projects } = useAppStore();

  const lastUpdated = useMemo(() => {
    const stamps = (projects || [])
      .map((p) => p.updatedAt || p.updated_at)
      .filter(Boolean)
      .map((d) => new Date(d).getTime())
      .filter((t) => !Number.isNaN(t));
    return stamps.length > 0 ? new Date(Math.max(...stamps)) : null;
  }, [projects]);

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto grid max-w-content gap-10 px-4 py-12 md:grid-cols-[1.3fr_0.7fr_1fr] md:gap-12 md:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-fill text-accent-fg">
              <i className="fas fa-helmet-safety" aria-hidden="true" />
            </span>
            <span className="text-body font-semibold text-fg">BuildRight Cameroon</span>
          </div>
          <p className="mt-4 max-w-[42ch] text-caption leading-relaxed text-fg-tertiary">
            A public record of infrastructure spending: what is being built, what it costs, and how far
            along it is.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-overline uppercase text-fg-tertiary">Browse</h2>
          <ul className="mt-4 flex flex-col gap-2.5 text-caption">
            <li>
              <Link to="/projects" className="text-fg-secondary hover:text-fg">
                All projects
              </Link>
            </li>
            <li>
              <Link to="/developers" className="text-fg-secondary hover:text-fg">
                About the team
              </Link>
            </li>
            <li>
              <Link to="/login" className="text-fg-secondary hover:text-fg">
                Staff sign in
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-overline uppercase text-fg-tertiary">Data provenance</h2>
          <dl className="mt-4 flex flex-col gap-3 text-caption">
            <div>
              <dt className="text-fg-tertiary">Source</dt>
              <dd className="mt-0.5 text-fg-secondary">Contractor reports and government records</dd>
            </div>
            <div>
              <dt className="text-fg-tertiary">Last updated</dt>
              <dd className="tabular mt-0.5 text-fg-secondary">
                {lastUpdated ? formatDate(lastUpdated) : 'Not recorded'}
              </dd>
            </div>
            <div>
              <dt className="text-fg-tertiary">Figures in</dt>
              <dd className="mt-0.5 text-fg-secondary">FCFA</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="border-t border-line-subtle">
        <div className="mx-auto flex max-w-content flex-col gap-2 px-4 py-5 text-caption text-fg-tertiary sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>&copy; {new Date().getFullYear()} BuildRight Group 16.</p>
          <p>Published for public accountability.</p>
        </div>
      </div>
    </footer>
  );
};
