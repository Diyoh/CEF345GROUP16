/**
 * Hierarchy-aware project filter predicates.
 *
 * Pure functions, kept out of the page so they can be tested without rendering.
 * They read the entity decoration the API attaches to every project:
 * ownerEntity {type, code, parentCode} and areas [{type, code, parentCode}].
 *
 * The region predicate also accepts the legacy free-text region string, because
 * projects created before the hierarchy existed carry only that, and links
 * shared with region names in them must keep working. Legacy comparison is
 * spelling-insensitive: the old strings say "North West" while the entity names
 * say "North-West".
 */

const normalise = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const areasOf = (project) => (Array.isArray(project.areas) ? project.areas : []);

/** Projects run by this ministry. Council work is deliberately excluded. */
export const matchesMinistry = (project, code) => {
  if (!code || code === 'All') return true;
  const owner = project.ownerEntity;
  return Boolean(owner && owner.type === 'MINISTRY' && owner.code === code);
};

/**
 * Projects touching this region: covering it as an area, covering one of its
 * councils, owned by one of its councils, or, for legacy rows, carrying the
 * region's name as free text.
 */
export const matchesRegion = (project, code, regionNameEn) => {
  if (!code || code === 'All') return true;

  if (areasOf(project).some((a) => a.code === code || a.parentCode === code)) return true;
  if (project.ownerEntity && project.ownerEntity.parentCode === code) return true;

  const legacy = normalise(regionNameEn || code);
  return normalise(project.region) === legacy;
};

/** Projects owned by this council or covering it as an area. */
export const matchesCouncil = (project, code) => {
  if (!code || code === 'All') return true;
  if (project.ownerEntity && project.ownerEntity.code === code) return true;
  return areasOf(project).some((a) => a.code === code);
};
