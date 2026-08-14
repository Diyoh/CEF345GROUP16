import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../useAppStore';
import { Button, Card, EmptyState } from '../components/ui';
import { useT } from '../i18n';
import { imageSrc, imageSrcSet, THUMB_WIDTHS } from '../utils/images';

/**
 * About. Renamed from "Developers" in the navigation: to a citizen that word reads as an
 * API portal and to a contractor it reads as a construction firm, while the page is about
 * the record itself. The route and the module name are unchanged so no existing link or
 * import breaks.
 *
 * This page carries the part of the product that the interface cannot state on its own:
 * what the numbers mean, what stops them being edited quietly, and what the record does
 * NOT claim. A transparency platform that is vague about its own limits is asking for the
 * same trust it exists to make unnecessary, so the limits section is not an apology at the
 * bottom of the page, it is part of the argument.
 *
 * Every string is translated. An English-only About page on a bilingual public record
 * would explain the platform's credibility to half the country it serves.
 */

/** A titled block used by the three-up and two-up explanatory sections. */
const Point = ({ icon, title, body }) => (
  <Card padding="lg" className="h-full">
    {icon && (
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-sunken text-accent">
        <i className={`fas ${icon}`} aria-hidden="true" />
      </span>
    )}
    <h3 className="text-h3 text-fg">{title}</h3>
    <p className="mt-2 text-body text-fg-secondary">{body}</p>
  </Card>
);

/** Section wrapper. Layout only: the spacing rhythm is the same on every band. */
const Section = ({ title, lead, children, className = '' }) => (
  <section className={`mx-auto max-w-content px-4 py-12 md:px-8 md:py-16 ${className}`}>
    {title && (
      <div className="max-w-prose">
        <h2 className="text-h2 text-fg">{title}</h2>
        {lead && <p className="mt-3 text-body text-fg-secondary">{lead}</p>}
      </div>
    )}
    {children}
  </section>
);

export const Developers = () => {
  const t = useT();
  const { teamMembers } = useAppStore();

  return (
    <div>
      {/* ---------- Opening statement ---------- */}
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-content px-4 py-14 md:px-8 md:py-20">
          <div className="max-w-3xl">
            <p className="text-overline uppercase text-fg-tertiary">{t('about.eyebrow')}</p>
            <h1 className="mt-3 font-serif text-h1 text-fg">{t('about.title')}</h1>
            <p className="mt-5 max-w-prose text-body-lg text-fg-secondary">{t('about.lead')}</p>
          </div>
        </div>
      </header>

      {/* ---------- Why ---------- */}
      <Section title={t('about.whyTitle')}>
        <div className="mt-6 max-w-prose space-y-4">
          <p className="text-body text-fg-secondary">{t('about.whyBody1')}</p>
          <p className="text-body text-fg-secondary">{t('about.whyBody2')}</p>
        </div>
      </Section>

      {/* ---------- What we publish ---------- */}
      <Section title={t('about.publishTitle')} className="border-t border-line">
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Point icon="fa-coins" title={t('about.publish1Title')} body={t('about.publish1Body')} />
          <Point icon="fa-helmet-safety" title={t('about.publish2Title')} body={t('about.publish2Body')} />
          <Point icon="fa-camera" title={t('about.publish3Title')} body={t('about.publish3Body')} />
        </div>
      </Section>

      {/* ---------- How the record is kept honest ---------- */}
      <Section title={t('about.trustTitle')} className="border-t border-line bg-surface">
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Point icon="fa-key" title={t('about.trust1Title')} body={t('about.trust1Body')} />
          <Point icon="fa-user-lock" title={t('about.trust2Title')} body={t('about.trust2Body')} />
          <Point icon="fa-clock-rotate-left" title={t('about.trust3Title')} body={t('about.trust3Body')} />
          <Point icon="fa-comments" title={t('about.trust4Title')} body={t('about.trust4Body')} />
        </div>
      </Section>

      {/* ---------- How to read the numbers ---------- */}
      <Section title={t('about.readTitle')} lead={t('about.readLead')} className="border-t border-line">
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <Point title={t('about.read1Title')} body={t('about.read1Body')} />
          <Point title={t('about.read2Title')} body={t('about.read2Body')} />
          <Point title={t('about.read3Title')} body={t('about.read3Body')} />
        </div>

        {/* The one piece of chart-reading guidance that is a judgement rather than a
            definition, so it is set apart from the three definitions above it. */}
        <p className="mt-6 max-w-prose border-l-2 border-accent pl-4 text-body text-fg-secondary">
          {t('about.readNote')}
        </p>
      </Section>

      {/* ---------- Limits ---------- */}
      <Section title={t('about.limitsTitle')} className="border-t border-line bg-surface">
        <ul className="mt-8 max-w-prose space-y-5">
          {[t('about.limit1'), t('about.limit2'), t('about.limit3')].map((limit) => (
            <li key={limit} className="flex gap-3">
              <i className="fas fa-circle-info mt-1 shrink-0 text-fg-tertiary" aria-hidden="true" />
              <span className="text-body text-fg-secondary">{limit}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* ---------- Open data ---------- */}
      <Section title={t('about.openTitle')} className="border-t border-line">
        <div className="mt-4 max-w-prose">
          <p className="text-body text-fg-secondary">{t('about.openBody')}</p>
          <Button
            as={Link}
            to="/projects"
            variant="primary"
            size="lg"
            className="mt-6"
            trailingIcon={<i className="fas fa-arrow-right" aria-hidden="true" />}
          >
            {t('about.openCta')}
          </Button>
        </div>
      </Section>

      {/* ---------- Team ---------- */}
      <Section title={t('about.teamTitle')} lead={t('about.teamLead')} className="border-t border-line bg-surface">
        {teamMembers.length === 0 ? (
          <EmptyState className="mt-8" icon="fa-users" title={t('project.noTeam')} />
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member) => (
              <li key={member.id}>
                <Card padding="lg" className="h-full">
                  <div className="flex items-center gap-4">
                    <img
                      src={imageSrc(member.imageUrl, 192)}
                      srcSet={imageSrcSet(member.imageUrl, THUMB_WIDTHS)}
                      alt=""
                      width="64"
                      height="64"
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-full border border-line object-cover"
                    />
                    <div className="min-w-0">
                      <h3 className="text-h3 text-fg">{member.name}</h3>
                      <p className="text-caption text-accent">{member.role}</p>
                    </div>
                  </div>
                  {member.bio && <p className="mt-4 text-body text-fg-secondary">{member.bio}</p>}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ---------- Take part ---------- */}
      <Section title={t('about.partTitle')} className="border-t border-line">
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Point icon="fa-camera-retro" title={t('about.partCitizenTitle')} body={t('about.partCitizenBody')} />
          <Point icon="fa-id-card" title={t('about.partStaffTitle')} body={t('about.partStaffBody')} />
        </div>
      </Section>
    </div>
  );
};
