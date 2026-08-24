/**
 * Entity display helpers.
 *
 * Names come from the database bilingual, nameEn and nameFr, because institution
 * names are data, not interface chrome, and cannot live in the dictionaries.
 * The locale picks which column a reader sees; either column falls back to the
 * other so a half-filled row still renders a name rather than a blank.
 */
export const entityName = (entity, locale) => {
  if (!entity) return '';
  return locale === 'fr'
    ? entity.nameFr || entity.nameEn || ''
    : entity.nameEn || entity.nameFr || '';
};

/** Translation key for an entity type badge. */
export const entityTypeKey = (type) => `gov.type${type}`;
