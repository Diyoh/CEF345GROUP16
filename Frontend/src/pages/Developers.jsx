import React from 'react';
import { useAppStore } from '../useAppStore';
import { Card, EmptyState } from '../components/ui';

/**
 * About. Renamed from "Developers" in the navigation: to a citizen that word reads as an
 * API portal and to a contractor it reads as a construction firm, while the page is a
 * team page. The route is unchanged so no existing link breaks.
 */
export const Developers = () => {
  const { teamMembers } = useAppStore();

  return (
    <div className="mx-auto max-w-content px-4 py-12 md:px-8 md:py-16">
      <header className="max-w-prose border-b border-line pb-8">
        <p className="text-overline uppercase text-fg-tertiary">About</p>
        <h1 className="mt-3 font-serif text-h1 text-fg">The people behind BuildRight</h1>
        <p className="mt-4 text-body-lg text-fg-secondary">
          BuildRight publishes what public infrastructure projects cost, who is building them, and how far
          along they are, so that anyone can check the record for themselves.
        </p>
      </header>

      {teamMembers.length === 0 ? (
        <EmptyState className="mt-12" icon="fa-users" title="Team details are not published yet" />
      ) : (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <li key={member.id}>
              <Card padding="lg" className="h-full">
                <div className="flex items-center gap-4">
                  <img
                    src={member.imageUrl}
                    alt=""
                    width="64"
                    height="64"
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-full border border-line object-cover"
                  />
                  <div className="min-w-0">
                    <h2 className="text-h3 text-fg">{member.name}</h2>
                    <p className="text-caption text-accent">{member.role}</p>
                  </div>
                </div>
                {member.bio && <p className="mt-4 text-body text-fg-secondary">{member.bio}</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
