import { describe, test, expect } from 'vitest';
import { placeProject, placeProjects, regionCode, REGION_CENTRES } from '../utils/mapPlacement';

describe('map placement', () => {
    test('a recorded site is used exactly', () => {
        expect(placeProject({ id: 'p1', region: 'Centre', latitude: '5.9631', longitude: '10.1591' }))
            .toEqual({ lat: 5.9631, lng: 10.1591, exact: true });
    });

    test('every spelling of a region resolves', () => {
        expect(regionCode('North West')).toBe('NW');
        expect(regionCode('north-west')).toBe('NW');
        expect(regionCode('Nord-Ouest')).toBe('NW');
        expect(regionCode('Adamaoua')).toBe('AD');
        expect(regionCode('Atlantis')).toBeNull();
    });

    test('without a site, a project sits near its region centre and is marked approximate', () => {
        const spot = placeProject({ id: 'p2', region: 'Littoral' });
        const [lat, lng] = REGION_CENTRES.LT;
        expect(spot.exact).toBe(false);
        expect(Math.abs(spot.lat - lat)).toBeLessThan(0.3);
        expect(Math.abs(spot.lng - lng)).toBeLessThan(0.3);
    });

    test('a project with neither a site nor a known region is left off the map', () => {
        expect(placeProject({ id: 'p3', region: 'Atlantis' })).toBeNull();
    });

    test('projects in one region get distinct, stable positions', () => {
        const projects = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, region: 'West' }));
        const first = placeProjects(projects);
        const keys = new Set(first.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`));
        expect(keys.size).toBe(8);
        expect(placeProjects(projects)).toEqual(first);
    });
});
