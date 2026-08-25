/**
 * HIERARCHY FILTER PREDICATES
 *
 * A filter that silently returns nothing is the worst kind of broken: it reads
 * as "no projects here" rather than as a bug. These cover every ownership and
 * area shape the schema allows, plus the legacy rows that predate the hierarchy.
 */

import { describe, test, expect } from 'vitest';
import { matchesMinistry, matchesRegion, matchesCouncil } from '../utils/projectFilters';

const ministryRoad = {
  region: 'North West',
  ownerEntity: { type: 'MINISTRY', code: 'MINTP', parentCode: 'CMR' },
  areas: [
    { type: 'REGION', code: 'NW', parentCode: 'CMR' },
    { type: 'REGION', code: 'SW', parentCode: 'CMR' },
  ],
};

const councilMarket = {
  region: 'North West',
  ownerEntity: { type: 'COUNCIL', code: 'NW-BAMENDA-I', parentCode: 'NW' },
  areas: [{ type: 'COUNCIL', code: 'NW-BAMENDA-I', parentCode: 'NW' }],
};

const nationalDam = {
  region: 'Centre',
  ownerEntity: { type: 'MINISTRY', code: 'MINEE', parentCode: 'CMR' },
  areas: [{ type: 'NATIONAL', code: 'CMR', parentCode: null }],
};

const legacyProject = { region: 'North West', ownerEntity: null, areas: [] };

describe('matchesMinistry', () => {
  test('matches the owning ministry and nothing else', () => {
    expect(matchesMinistry(ministryRoad, 'MINTP')).toBe(true);
    expect(matchesMinistry(ministryRoad, 'MINEE')).toBe(false);
  });

  test('council work is not ministry work', () => {
    expect(matchesMinistry(councilMarket, 'MINTP')).toBe(false);
  });

  test('All passes everything, including legacy rows', () => {
    expect(matchesMinistry(legacyProject, 'All')).toBe(true);
  });
});

describe('matchesRegion', () => {
  test('a multi-region road matches each region it crosses', () => {
    expect(matchesRegion(ministryRoad, 'NW')).toBe(true);
    expect(matchesRegion(ministryRoad, 'SW')).toBe(true);
    expect(matchesRegion(ministryRoad, 'LT')).toBe(false);
  });

  test('council work counts toward its region through the parent link', () => {
    expect(matchesRegion(councilMarket, 'NW')).toBe(true);
    expect(matchesRegion(councilMarket, 'SW')).toBe(false);
  });

  test('a national project is not claimed by any single region', () => {
    expect(matchesRegion(nationalDam, 'NW')).toBe(false);
  });

  test('legacy rows match by name, spelling-insensitively', () => {
    // The old free text says "North West"; the entity name says "North-West".
    expect(matchesRegion(legacyProject, 'NW', 'North-West')).toBe(true);
    expect(matchesRegion(legacyProject, 'SW', 'South-West')).toBe(false);
  });

  test('legacy name values from old shared links still work as the code argument', () => {
    expect(matchesRegion(legacyProject, 'North West')).toBe(true);
  });
});

describe('matchesCouncil', () => {
  test('matches by ownership and by area', () => {
    expect(matchesCouncil(councilMarket, 'NW-BAMENDA-I')).toBe(true);
    expect(matchesCouncil(councilMarket, 'NW-NDOP')).toBe(false);
  });

  test('a regional road does not claim any single council', () => {
    expect(matchesCouncil(ministryRoad, 'NW-BAMENDA-I')).toBe(false);
  });

  test('survives projects with no decoration at all', () => {
    expect(matchesCouncil(legacyProject, 'NW-BAMENDA-I')).toBe(false);
    expect(matchesCouncil({}, 'All')).toBe(true);
  });
});
