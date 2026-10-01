/**
 * SEARCH LEXICON
 *
 * Words whose meaning is fixed, matched by code in English, French and common
 * Pidgin. Tested against a real 3B local model, this is more reliable than the
 * model for closed vocabularies: the model missed "stalled" and "en cours",
 * picked the Ministry of Transport for "public works", and left "routes"
 * untranslated. The model is still used for what a word list cannot do (free
 * phrasing, picking out a place name); see projectSearch.js.
 *
 * Every phrase is written already normalised: lower case, no accents,
 * punctuation as single spaces.
 */

export const normalise = (value) => String(value || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Whole-phrase match, so "stalled" never matches inside another word. */
export const containsPhrase = (text, phrase) => ` ${normalise(text)} `.includes(` ${normalise(phrase)} `);

const STATUS_PHRASES = {
    Stalled: ['stalled', 'stopped', 'abandoned', 'blocked', 'on hold', 'halted', 'a l arret', 'arrete', 'arretes', 'arretee', 'arretees', 'bloque', 'bloques', 'bloquee', 'bloquees', 'abandonne', 'abandonnes', 'abandonnee', 'abandonnees', 'don stop', 'no di move'],
    Completed: ['finished', 'completed', 'complete', 'done', 'delivered', 'termine', 'termines', 'terminee', 'terminees', 'acheve', 'acheves', 'achevee', 'achevees', 'fini', 'finis', 'finie', 'finies', 'don finish'],
    Ongoing: ['ongoing', 'in progress', 'under construction', 'underway', 'en cours', 'en construction', 'di go on'],
    Planned: ['planned', 'not started', 'not yet started', 'upcoming', 'prevu', 'prevus', 'prevue', 'prevues', 'pas commence', 'pas encore commence', 'a venir'],
};

const SORT_PHRASES = {
    budget: ['most expensive', 'expensive', 'biggest', 'largest', 'costliest', 'highest budget', 'plus cher', 'plus chers', 'plus couteux', 'couteux', 'plus gros', 'plus grands'],
    attention: ['behind schedule', 'overdue', 'overspending', 'overspent', 'over budget', 'problems', 'worst', 'delayed', 'late', 'wasting', 'depassement', 'depasse', 'en retard', 'retard', 'probleme', 'problemes', 'pires', 'wahala'],
    progress: ['most advanced', 'furthest along', 'nearly finished', 'almost finished', 'plus avances', 'plus avance', 'presque termine', 'presque termines'],
};

/** Kind of work -> the English word the (English) project titles contain. */
const KIND_PHRASES = {
    road: ['road', 'roads', 'route', 'routes', 'rue', 'rues', 'street', 'streets', 'voirie'],
    highway: ['highway', 'highways', 'autoroute', 'autoroutes', 'motorway'],
    bridge: ['bridge', 'bridges', 'pont', 'ponts'],
    hospital: ['hospital', 'hospitals', 'hopital', 'hopitaux', 'clinic', 'clinics', 'health centre', 'health center', 'centre de sante', 'centres de sante'],
    school: ['school', 'schools', 'ecole', 'ecoles', 'college', 'colleges', 'lycee', 'lycees', 'classroom', 'classrooms', 'salle de classe', 'salles de classe'],
    market: ['market', 'markets', 'marche', 'marches', 'makit'],
    water: ['water', 'water supply', 'borehole', 'boreholes', 'eau', 'forage', 'forages', 'puits', 'adduction'],
    electricity: ['electricity', 'power line', 'power lines', 'power station', 'electrification', 'electricite'],
    stadium: ['stadium', 'stadiums', 'stade', 'stades'],
    housing: ['housing', 'houses', 'logement', 'logements', 'habitat'],
};

export const KINDS = Object.keys(KIND_PHRASES);

/** Words that carry no filter on their own, in any of the three languages. */
export const GENERIC_WORDS = [
    'project', 'projects', 'projet', 'projets', 'work', 'works', 'travaux', 'chantier', 'chantiers',
    'public', 'publique', 'publics', 'publiques',
    // English function words
    'the', 'a', 'an', 'of', 'in', 'at', 'on', 'for', 'to', 'and', 'or', 'with', 'that', 'which', 'what', 'who',
    'are', 'is', 'was', 'were', 'be', 'been', 'there', 'any', 'all', 'some', 'show', 'me', 'list', 'find', 'give',
    'please', 'my', 'our', 'their', 'its', 'this', 'these', 'those', 'how', 'many',
    // French
    'les', 'des', 'de', 'la', 'le', 'du', 'l', 'd', 'un', 'une', 'dans', 'en', 'a', 'au', 'aux', 'et', 'ou', 'qui',
    'que', 'quels', 'quelles', 'quel', 'quelle', 'sont', 'est', 'montre', 'montrez', 'moi', 'avec', 'tous', 'toutes', 'pour', 'sur',
    // Pidgin
    'wetin', 'dey', 'for', 'na', 'di', 'don', 'happen', 'abeg', 'which', 'wey', 'sabi',
];

/**
 * True when a quote says nothing beyond what was already explained: every
 * word in it is either generic or part of a phrase the word lists matched
 * ("santé" inside "ministère de la santé").
 */
export const isExplainedBy = (quote, consumed) => {
    const known = new Set(consumed.flatMap((phrase) => normalise(phrase).split(' ')));
    return normalise(quote).split(' ').filter(Boolean).every((w) => known.has(w) || GENERIC_WORDS.includes(w));
};

/** First key whose phrase occurs in the text, with the phrase that matched. */
const firstMatch = (text, table) => {
    for (const [key, phrases] of Object.entries(table)) {
        // Longest phrases first, so "not started" wins over "started"-like overlaps.
        const hit = [...phrases].sort((a, b) => b.length - a.length).find((p) => containsPhrase(text, p));
        if (hit) return { key, phrase: hit };
    }
    return null;
};

export const findStatus = (text) => firstMatch(text, STATUS_PHRASES);
export const findSort = (text) => firstMatch(text, SORT_PHRASES);
export const findKind = (text) => firstMatch(text, KIND_PHRASES);

/**
 * Phrases that refer to the entity: its English and French names, the name
 * without "Ministry of", and its code when the code is not an everyday word
 * (region codes such as NO, SO and WE are, ministry codes such as MINTP are not).
 */
const entityPhrases = (entity) => {
    const full = [entity.name_en, entity.name_fr].map(normalise);
    // People say "ministère de la santé" for the Ministère de la Santé publique.
    const names = [...full, ...full.map((n) => n.replace(/\s(public|publique|publics|publiques)\b/g, '')).filter((n) => !full.includes(n))];
    const short = full.flatMap((n) => {
        const stripped = n.replace(/^(ministry of( the)?|ministere (de la|des|de l|du|de))\s+/, '');
        return stripped !== n ? [stripped] : [];
    });
    const code = entity.code.length >= 4 ? [normalise(entity.code)] : [];
    return [...new Set([...names, ...short, ...code])].filter((p) => p.length >= 3);
};

/**
 * The entity the text names, preferring the longest match ("public works"
 * must not lose to a shorter accidental hit).
 */
export const findEntity = (text, entities) => {
    // "health centre" names a kind of work, not the Centre region.
    let rest = ` ${normalise(text)} `;
    for (const phrases of Object.values(KIND_PHRASES)) {
        for (const p of phrases) rest = rest.split(` ${p} `).join('  ');
    }
    text = rest;
    let best = null;
    for (const entity of entities) {
        for (const phrase of entityPhrases(entity)) {
            if (containsPhrase(text, phrase) && (!best || phrase.length > best.phrase.length)) {
                best = { entity, phrase };
            }
        }
    }
    return best;
};
