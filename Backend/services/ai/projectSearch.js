/**
 * PLAIN-LANGUAGE PROJECT SEARCH
 *
 * Turns "stalled roads in Bamenda" into the filters the Projects page already
 * has (status=Stalled, q=Bamenda, region=NW). The model never answers the
 * question itself: it only picks filters, and the page then shows the real
 * projects those filters match. So the worst a confused model can do is pick
 * the wrong filter, which the user sees and can remove; it cannot invent a
 * project or a figure.
 *
 * Words with a fixed meaning (statuses, sort words, ministry and region
 * names, kinds of work) are matched by code first, in English, French and
 * Pidgin (searchLexicon.js); the model fills in only what those lists do not
 * settle. Three safeguards apply to whatever the model contributes:
 *   1. Status, region, ministry and sort are enums in the JSON schema, so the
 *      model can only choose real values (Ollama and Claude both enforce it).
 *   2. Evidence. For every filter the model must also copy the words of the
 *      question that justify it, and a filter is kept only if those words
 *      really are in the question. Small local models otherwise fill every
 *      field ("which hospitals are finished?" came back with a ministry and a
 *      sort order nobody asked for); quoting cannot be faked against a check
 *      made in code.
 *   3. Everything is validated again here against the database, and place
 *      names are matched to councils by this code, not by the model. Small
 *      local models have short context windows, so the 150+ councils are not
 *      put in the prompt at all.
 */

import pool from '../../config/db.js';
import { badRequest } from '../../utils/AppError.js';
import { PROJECT_STATUSES } from '../projectService.js';
import { getProvider } from './providers.js';
import {
    normalise, containsPhrase, findStatus, findSort, findKind, findEntity, isExplainedBy, KINDS,
} from './searchLexicon.js';

export const SORTS = ['attention', 'budget', 'progress'];
export const MAX_QUERY_LENGTH = 300;

/* ------------------------------------------------------------ reference data */

const ENTITY_CACHE_MS = 10 * 60 * 1000;
let entityCache = { at: 0, data: null };

/** Regions, ministries and councils, cached: they change a few times a year. */
export const loadEntities = async () => {
    if (entityCache.data && Date.now() - entityCache.at < ENTITY_CACHE_MS) return entityCache.data;
    const [rows] = await pool.query(
        "SELECT id, type, code, name_en, name_fr, parent_id FROM gov_entities WHERE type IN ('REGION', 'MINISTRY', 'COUNCIL') ORDER BY name_en"
    );
    const data = {
        regions: rows.filter((r) => r.type === 'REGION'),
        ministries: rows.filter((r) => r.type === 'MINISTRY'),
        councils: rows.filter((r) => r.type === 'COUNCIL'),
    };
    entityCache = { at: Date.now(), data };
    return data;
};

export const clearEntityCacheForTests = () => {
    entityCache = { at: 0, data: null };
};

/* ------------------------------------------------------------------- prompt */

const NONE = 'none';

// Property order matters: models write fields in schema order, so each
// *_words field (the quote) comes before the value it justifies.
export const buildSchema = (entities) => {
    const properties = {
        status_words: { type: 'string' },
        status: { type: 'string', enum: [NONE, ...PROJECT_STATUSES] },
        region_words: { type: 'string' },
        region: { type: 'string', enum: [NONE, ...entities.regions.map((r) => r.code)] },
        ministry_words: { type: 'string' },
        ministry: { type: 'string', enum: [NONE, ...entities.ministries.map((m) => m.code)] },
        place: { type: 'string' },
        kind_words: { type: 'string' },
        keyword: { type: 'string' },
        sort_words: { type: 'string' },
        sort: { type: 'string', enum: [NONE, ...SORTS] },
    };
    return { type: 'object', additionalProperties: false, required: Object.keys(properties), properties };
};

export const buildSystemPrompt = (entities) => `You turn a citizen's question about public infrastructure projects in Cameroon into search filters. The question may be in English, French or Cameroonian Pidgin. Reply with JSON only.

Most questions mention only one or two things. For every field, first copy into its *_words field the exact words of the question that state it. If the question does not state it, leave *_words empty and choose none. Never fill a field the question does not mention.

Fields:
- status: Planned, Ongoing, Stalled or Completed. "stalled", "stopped", "abandoned", "à l'arrêt", "bloqué" mean Stalled. "finished", "done", "terminé", "achevé" mean Completed. "in progress", "en cours" mean Ongoing. "planned", "not started", "prévu" mean Planned.
- region: the code of a region the question names.
${entities.regions.map((r) => `  ${r.code} = ${r.name_en} / ${r.name_fr}`).join('\n')}
- ministry: the code of a ministry the question names.
${entities.ministries.map((m) => `  ${m.code} = ${m.name_en} / ${m.name_fr}`).join('\n')}
- place: a town, city or council named in the question, copied exactly as written including any number (for example "Bamenda", "Douala III"). Not a region. Empty if none.
- kind_words: the words of the question naming the kind of work (for example "roads", "hôpitaux"). Empty if none.
- keyword: ONE English word for the kind of work in kind_words, because project titles are in English. One of: ${KINDS.join(', ')}. Translate French ("route" means road, "hôpital" means hospital, "marché" means market, "école" means school). Empty if kind_words is empty.
- sort: "budget" when the question asks for the most expensive or biggest projects, "progress" when it asks for the most advanced, "attention" when it asks about problems, overspending, delays or the worst projects.`;

/* --------------------------------------------------------------- resolution */

/** "Bamenda I" -> "bamenda": councils are often numbered parts of one town. */
const townOf = (name) => normalise(name).replace(/\s+(i{1,3}|iv|v|vi{0,3}|[0-9]+(st|nd|rd|th)?|1er|2e|3e)$/, '').trim();

/**
 * Matches a place name to councils. One match pins the council; several in the
 * same region (Bamenda I, II, III) narrow to that region and keep the town as a
 * text search, since project locations name the town.
 */
export const resolvePlace = (place, entities) => {
    const wanted = normalise(place);
    if (!wanted) return null;

    const region = entities.regions.find((r) => normalise(r.name_en) === wanted || normalise(r.name_fr) === wanted);
    if (region) return { region };

    const exact = entities.councils.filter((c) => normalise(c.name_en) === wanted || normalise(c.name_fr) === wanted);
    if (exact.length === 1) return { council: exact[0] };

    const sameTown = entities.councils.filter((c) => townOf(c.name_en) === wanted || townOf(c.name_fr) === wanted);
    if (sameTown.length === 1) return { council: sameTown[0] };
    if (sameTown.length > 1) {
        const regionIds = new Set(sameTown.map((c) => c.parent_id));
        const parent = regionIds.size === 1 ? entities.regions.find((r) => r.id === [...regionIds][0]) : null;
        return { region: parent || null, text: place.trim() };
    }

    return { text: place.trim() };
};

/**
 * A town the question names, found from the council list ("Bamenda" from
 * Bamenda I, II, III), longest first so "Douala" does not hide a longer name.
 */
export const findTown = (question, entities) => {
    // normalised town -> the town as the council list writes it
    const towns = new Map();
    for (const c of entities.councils) {
        for (const name of [c.name_en, c.name_fr]) {
            const display = name.replace(/\s+([IVX]+|\d+(st|nd|rd|th|er|e)?)$/i, '').trim();
            if (!towns.has(townOf(name))) towns.set(townOf(name), display);
        }
    }
    const hit = [...towns.keys()].filter((t) => t.length >= 3).sort((x, y) => y.length - x.length)
        .find((town) => containsPhrase(question, town));
    return hit ? towns.get(hit) : null;
};

/** True when the quoted words really occur in the question (accent- and case-insensitive). */
export const quotedIn = (words, question) => normalise(words).length > 0 && containsPhrase(question, words);

const nameIn = (entity, locale) => (locale === 'fr' ? entity.name_fr : entity.name_en);

/**
 * Decides the filters for a question from two sources: the word lists, which
 * are checked first because they are exact, and the model's answer, used only
 * for what the lists did not settle and only where the model's quote is really
 * in the question. Exported so the rules are testable without a model.
 */
export const toFilters = (answer, entities, locale = 'en', question = '') => {
    const given = answer && typeof answer === 'object' ? answer : {};
    const filters = {};
    const applied = [];

    // Everything the word lists recognise is decided first. Their matched
    // phrases are "consumed": a model quote made only of consumed or generic
    // words adds nothing and is ignored ("public works" is a ministry, not a
    // kind of work; "behind schedule" is a delay, not a status).
    const lex = {
        status: findStatus(question),
        sort: findSort(question),
        kind: findKind(question),
        ministry: findEntity(question, entities.ministries),
        region: findEntity(question, entities.regions),
        council: findEntity(question, entities.councils),
    };
    const consumed = Object.values(lex).filter(Boolean).map((m) => m.phrase);
    const knownTown = lex.council ? null : findTown(question, entities);
    if (knownTown) consumed.push(knownTown);

    // A model value counts only if its quote is in the question, says
    // something new and, for named entities, actually names that entity.
    const usableQuote = (quote) => quotedIn(quote, question) && !isExplainedBy(quote, consumed);
    const modelPick = (field, allowed) => (usableQuote(given[`${field}_words`]) && allowed.includes(given[field]) ? given[field] : '');
    const modelEntity = (field, list) => {
        const entity = list.find((e) => e.code === given[field]);
        const quote = given[`${field}_words`];
        return entity && usableQuote(quote) && findEntity(quote, [entity]) ? entity : null;
    };

    const status = lex.status?.key || modelPick('status', PROJECT_STATUSES);
    if (status) {
        filters.status = status;
        applied.push({ key: 'status', value: status });
    }

    const ministry = lex.ministry?.entity || modelEntity('ministry', entities.ministries);
    if (ministry) {
        filters.ministry = ministry.code;
        applied.push({ key: 'ministry', value: ministry.code, label: nameIn(ministry, locale) });
    }

    // Place: a council named in full ("Douala III") is exact; otherwise the
    // model's place, if it is really in the question.
    let region = lex.region?.entity || modelEntity('region', entities.regions);
    let placeText = '';
    // Known names are matched by code; the model's place covers the rest.
    const namedCouncil = lex.council?.entity;
    const modelPlace = usableQuote(given.place) ? String(given.place).slice(0, 80) : '';
    const resolved = namedCouncil
        ? { council: namedCouncil }
        : resolvePlace(knownTown || modelPlace, entities);
    if (resolved?.council) {
        filters.council = resolved.council.code;
        applied.push({ key: 'council', value: resolved.council.code, label: nameIn(resolved.council, locale) });
        // The council fixes the region; a contradicting region is dropped.
        region = entities.regions.find((r) => r.id === resolved.council.parent_id) || region;
    } else if (resolved) {
        if (resolved.region) region = resolved.region;
        if (resolved.text) placeText = resolved.text;
    }
    if (region) {
        filters.region = region.code;
        applied.push({ key: 'region', value: region.code, label: nameIn(region, locale) });
    }

    // The page's text search takes several words, each of which must match.
    // A kind of work is named in a word or two; a long quote is the model
    // copying the question rather than finding the words.
    const kindQuoteOk = usableQuote(given.kind_words) && normalise(given.kind_words).split(' ').length <= 3;
    const kind = lex.kind?.key || (kindQuoteOk && KINDS.includes(given.keyword) ? given.keyword : '');
    const terms = [placeText, kind].filter(Boolean);
    if (terms.length) {
        filters.q = terms.join(' ');
        for (const term of terms) applied.push({ key: 'q', value: term });
    }

    const sort = lex.sort?.key || modelPick('sort', SORTS);
    if (sort) {
        filters.sort = sort;
        applied.push({ key: 'sort', value: sort });
    }

    return { filters, applied };
};

/* -------------------------------------------------------------------- entry */

export const interpretQuery = async ({ query, locale = 'en', provider = getProvider() }) => {
    const text = typeof query === 'string' ? query.trim() : '';
    if (text.length < 3) throw badRequest('Type a question of at least 3 characters');
    if (text.length > MAX_QUERY_LENGTH) throw badRequest(`Keep the question under ${MAX_QUERY_LENGTH} characters`);

    const entities = await loadEntities();
    const answer = await provider.generateJson({
        system: buildSystemPrompt(entities),
        user: text,
        schema: buildSchema(entities),
        maxTokens: 400,
    });

    return {
        ...toFilters(answer, entities, locale === 'fr' ? 'fr' : 'en', text),
        provider: provider.name,
        model: provider.model,
    };
};
