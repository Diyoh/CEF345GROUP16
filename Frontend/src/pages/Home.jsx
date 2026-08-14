import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../useAppStore';
import { ProjectCard } from '../components/ProjectCard';
import { Button, Card, StatTile, EmptyState } from '../components/ui';
import { formatMoney } from '../utils/helpers';
import { projectHealth, byVarianceAsc } from '../utils/projectHealth';
import { ProjectStatus } from '../types';

/**
 * Public homepage. Spec: docs/design/02-ia-ux.md section 3.1.
 *
 * This page is no longer a second project browser. It is an editorial front page:
 * a hero, the national totals, what changed recently, and what needs attention. Every
 * section links into /projects carrying its filter, so a citizen who starts here never
 * has to restart their query on the browse page.
 */
/**
 * Hero slideshow. A curated, editorially-chosen set that ships with the app rather than
 * whichever photos contractors happen to have uploaded — the front page has to read as a
 * credible public record on day one, before any project has a single image attached.
 * Files live in public/hero/, so these are plain absolute URLs, not bundled imports.
 * Ordered strongest-first: the first frame is the one that loads eagerly and is seen most.
 */
/** How long one image holds, zooming, before it starts handing over to the next. */
const HERO_INTERVAL_MS = 4000;

/**
 * Dissolve length. The outgoing frame is still zooming inward throughout, so the two
 * frames are always moving the same direction while they overlap — that is what stops
 * the handoff reading as a zoom out.
 * HERO_INTERVAL_MS + HERO_FADE_MS must stay equal to the `hero-zoom` animation duration.
 */
const HERO_FADE_MS = 600;

const HERO_SLIDES = [
  { id: 'road-construction', image: '/hero/road-construction.jpg', caption: 'Road resurfacing works in progress' },
  { id: 'yaounde-city', image: '/hero/yaounde-city.jpg', caption: 'Yaoundé — city road network' },
  { id: 'site-workforce', image: '/hero/site-workforce.jpg', caption: 'Site crew and plant at a works compound' },
  { id: 'land-reclamation', image: '/hero/land-reclamation.jpg', caption: 'Land reclamation after site closure' },
];

export const Home = () => {
  const { projects } = useAppStore();
  const [search, setSearch] = useState('');

  const totals = useMemo(() => {
    const budget = projects.reduce((acc, p) => acc + (Number(p.budget) || 0), 0);
    const spent = projects.reduce((acc, p) => acc + (Number(p.spent) || 0), 0);
    return { budget, spent, count: projects.length };
  }, [projects]);

  const needsAttention = useMemo(
    () =>
      projects
        .filter((p) => {
          const h = projectHealth(p);
          return p.status === ProjectStatus.STALLED || h.overBudget || h.band === 'critical' || h.delayed;
        })
        .sort(byVarianceAsc)
        .slice(0, 4),
    [projects]
  );

  const recent = useMemo(() => [...projects].reverse().slice(0, 6), [projects]);

  const heroSlides = HERO_SLIDES;

  // `outgoing` is the frame currently fading away. It keeps its zoom class for the length
  // of the crossfade so it holds the scale it reached instead of snapping back to 1 — the
  // snap is what makes most slideshows look broken. Dropping the class once it is invisible
  // is also what resets the animation, so the frame zooms from 1 again on its next turn.
  const [slide, setSlide] = useState(0);
  const [outgoing, setOutgoing] = useState(null);
  const slideRef = useRef(0);
  slideRef.current = slide;

  const goTo = (next) => {
    if (next === slideRef.current) return;
    setOutgoing(slideRef.current);
    setSlide(next);
  };

  useEffect(() => {
    if (heroSlides.length < 2) return undefined;
    const timer = setInterval(
      () => goTo((slideRef.current + 1) % heroSlides.length),
      HERO_INTERVAL_MS
    );
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Stop treating a frame as outgoing once it has finished fading, which drops its zoom
  // class and arms the animation to replay from the start next time round.
  useEffect(() => {
    if (outgoing === null) return undefined;
    const timer = setTimeout(() => setOutgoing(null), HERO_FADE_MS);
    return () => clearTimeout(timer);
  }, [outgoing, slide]);

  return (
    <div className="pb-20">
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden border-b border-line bg-surface">
        <div className="absolute inset-0" aria-hidden="true">
          {heroSlides.map((s, i) => (
            <div
              key={s.id}
              style={{ transitionDuration: `${HERO_FADE_MS}ms` }}
              className={`absolute inset-0 transition-opacity ease-in-out ${
                i === slide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={s.image}
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className={`h-full w-full object-cover will-change-transform ${
                  i === slide || i === outgoing ? 'hero-zoom' : ''
                }`}
              />
            </div>
          ))}
          {/* Overlay carries the text contrast: every foreground pair below is measured
              against it, not against the photograph, so a light frame can never wash out
              the headline. */}
          <div className="absolute inset-0 bg-[rgb(var(--overlay)/0.72)]" />
        </div>

        <div className="relative mx-auto max-w-content px-4 py-16 text-white md:px-8 md:py-24">
          <div className="max-w-3xl">
            <p className="text-overline uppercase text-white/70">Public infrastructure record</p>
            <h1 className="mt-3 font-serif text-display text-white">
              Every project, every franc, on the record.
            </h1>
            <p className="mt-5 max-w-prose text-body-lg text-white/85">
              {totals.count} public construction projects across Cameroon, with what was budgeted, what has
              been spent, and how much has actually been built.
            </p>

            <form
              className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
              onSubmit={(e) => e.preventDefault()}
              role="search"
            >
              <label htmlFor="hero-search" className="sr-only">
                Search projects by name or town
              </label>
              <input
                id="hero-search"
                type="search"
                placeholder="Search by project or town"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-sm border border-input bg-canvas px-4 text-body text-fg placeholder:text-fg-placeholder"
              />
              <Button
                as={Link}
                to={`/projects${search ? `?q=${encodeURIComponent(search)}` : ''}`}
                variant="primary"
                size="lg"
              >
                Find projects
              </Button>
            </form>
          </div>

          {heroSlides.length > 1 && (
            <div className="mt-10 flex items-center gap-3">
              <div className="flex items-center gap-2">
                {heroSlides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Show image ${i + 1} of ${heroSlides.length}: ${s.caption}`}
                    aria-current={i === slide}
                    className={`h-1.5 rounded-full transition-all duration-fast ${
                      i === slide ? 'w-8 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
              <p className="truncate text-caption text-white/70">{heroSlides[slide]?.caption}</p>
            </div>
          )}
        </div>
      </section>

      {/* ---------- National totals ---------- */}
      <section className="mx-auto max-w-content px-4 py-12 md:px-8 md:py-16">
        <h2 className="sr-only">National totals</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Projects tracked" value={totals.count} hint="Across all ten regions" />
          <StatTile
            label="Total budget"
            value={formatMoney(totals.budget, 'compact')}
            exact={formatMoney(totals.budget, 'full')}
          />
          <StatTile
            label="Total spent"
            value={formatMoney(totals.spent, 'compact')}
            exact={formatMoney(totals.spent, 'full')}
            delta={totals.budget > 0 ? `${Math.round((totals.spent / totals.budget) * 100)}% of budget` : undefined}
            deltaTone="neutral"
          />
        </div>
      </section>

      {/* ---------- Needs attention ---------- */}
      {needsAttention.length > 0 && (
        <section className="mx-auto max-w-content px-4 pb-16 md:px-8">
          <div className="mb-6 flex items-end justify-between gap-4 border-l-2 border-over-line pl-4">
            <div>
              <h2 className="text-h2 text-fg">Needs attention</h2>
              <p className="mt-1 text-caption text-fg-tertiary">
                Stalled, delayed, or spending faster than they are building.
              </p>
            </div>
            <Button as={Link} to="/projects?status=Stalled" variant="ghost" size="sm">
              See all
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {needsAttention.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Recently updated ---------- */}
      <section className="mx-auto max-w-content px-4 pb-16 md:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-h2 text-fg">Recently updated</h2>
          <Button as={Link} to="/projects" variant="ghost" size="sm">
            Browse all projects
          </Button>
        </div>

        {recent.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon="fa-folder-open"
              title="No projects published yet"
              body="Once a project is created it appears here for everyone to follow."
            />
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
