import { findStatus, findSort, findKind, findEntity, containsPhrase } from '../services/ai/searchLexicon.js';

const REGIONS = [
    { code: 'CE', name_en: 'Centre', name_fr: 'Centre' },
    { code: 'NO', name_en: 'North', name_fr: 'Nord' },
    { code: 'FN', name_en: 'Far North', name_fr: 'Extrême-Nord' },
    { code: 'NW', name_en: 'North-West', name_fr: 'Nord-Ouest' },
    { code: 'WE', name_en: 'West', name_fr: 'Ouest' },
];
const MINISTRIES = [
    { code: 'MINTP', name_en: 'Ministry of Public Works', name_fr: 'Ministère des Travaux publics' },
    { code: 'MINT', name_en: 'Ministry of Transport', name_fr: 'Ministère des Transports' },
];

test('phrases match whole words only, ignoring accents and case', () => {
    expect(containsPhrase("Routes À L'ARRÊT", 'a l arret')).toBe(true);
    expect(containsPhrase('installed', 'stalled')).toBe(false);
});

test.each([
    ['stalled roads', 'Stalled'], ['travaux arrêtés', 'Stalled'], ['which hospitals are finished?', 'Completed'],
    ['écoles en cours', 'Ongoing'], ['projects not started yet', 'Planned'], ['roads in Bamenda', undefined],
])('status in "%s"', (text, expected) => expect(findStatus(text)?.key).toBe(expected));

test.each([
    ['most expensive projects', 'budget'], ['les projets les plus chers', 'budget'],
    ['projects that are overspending', 'attention'], ['projets en retard', 'attention'], ['no problem here', undefined],
])('sort in "%s"', (text, expected) => expect(findSort(text)?.key).toBe(expected));

test.each([
    ['stalled roads', 'road'], ['hôpitaux', 'hospital'], ['marché de Bamenda', 'market'], ['the school well', 'school'], ['projects', undefined],
])('kind of work in "%s"', (text, expected) => expect(findKind(text)?.key).toBe(expected));

test('the longest region name wins: Far North is not North, North-West is not West', () => {
    expect(findEntity('roads in the far north', REGIONS).entity.code).toBe('FN');
    expect(findEntity('routes dans le Nord-Ouest', REGIONS).entity.code).toBe('NW');
});

test('everyday words are not regions: "we", "no", and the Centre in "health centre"', () => {
    expect(findEntity('we want no delays', REGIONS)).toBeNull();
    expect(findEntity('health centre in Maroua', REGIONS)).toBeNull();
});

test('a ministry is found by its short name in either language, and public works is not transport', () => {
    expect(findEntity('public works projects', MINISTRIES).entity.code).toBe('MINTP');
    expect(findEntity('les travaux publics', MINISTRIES).entity.code).toBe('MINTP');
    expect(findEntity('MINT projects', MINISTRIES).entity.code).toBe('MINT');
});
