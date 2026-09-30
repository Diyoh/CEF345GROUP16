/**
 * WHERE A PROJECT GOES ON THE MAP
 *
 * A project with a recorded site position is drawn there. One without is drawn
 * near its region's centre and marked approximate, so the map never implies a
 * precision the record does not have. Approximate markers are spread on a small
 * deterministic spiral around the centre, so ten projects in one region stay
 * ten clickable markers and do not move between page loads.
 */

/** Approximate centres of Cameroon's ten regions (the capital's area). */
export const REGION_CENTRES = {
  AD: [7.3, 13.6],   // Adamawa, Ngaoundéré
  CE: [3.9, 11.5],   // Centre, Yaoundé
  EA: [4.4, 13.7],   // East, Bertoua
  FN: [10.6, 14.3],  // Far North, Maroua
  LT: [4.05, 9.75],  // Littoral, Douala
  NO: [9.3, 13.4],   // North, Garoua
  NW: [5.96, 10.15], // North-West, Bamenda
  SO: [2.9, 11.15],  // South, Ebolowa
  SW: [4.16, 9.24],  // South-West, Buea
  WE: [5.48, 10.42], // West, Bafoussam
};

/** Every spelling the projects.region column and the entity names use. */
const REGION_CODE_BY_NAME = {
  adamawa: 'AD', adamaoua: 'AD',
  centre: 'CE', center: 'CE',
  east: 'EA', est: 'EA',
  'far north': 'FN', 'extreme-nord': 'FN', 'extrême-nord': 'FN',
  littoral: 'LT',
  north: 'NO', nord: 'NO',
  'north west': 'NW', 'north-west': 'NW', 'nord-ouest': 'NW',
  south: 'SO', sud: 'SO',
  'south west': 'SW', 'south-west': 'SW', 'sud-ouest': 'SW',
  west: 'WE', ouest: 'WE',
};

export const regionCode = (name) => REGION_CODE_BY_NAME[String(name || '').trim().toLowerCase()] || null;

/** Small stable hash, so a project's offset is the same on every load. */
const hashIndex = (text) => {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.codePointAt(0)) | 0;
  return Math.abs(h);
};

/**
 * Returns { lat, lng, exact } for a project, or null if it can be placed nowhere
 * (no coordinates and an unrecognised region).
 */
export const placeProject = (project, indexInRegion = 0) => {
  const lat = Number(project.latitude);
  const lng = Number(project.longitude);
  if (project.latitude != null && project.longitude != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng, exact: true };
  }

  const centre = REGION_CENTRES[regionCode(project.region)];
  if (!centre) return null;

  // Golden-angle spiral: evenly spread, never overlapping, ~5 km steps.
  const step = indexInRegion + (hashIndex(project.id) % 3);
  const angle = step * 2.39996;
  const radius = 0.05 * Math.sqrt(step);
  return { lat: centre[0] + radius * Math.sin(angle), lng: centre[1] + radius * Math.cos(angle), exact: false };
};

/** Places a whole list, spreading approximate markers per region. */
export const placeProjects = (projects) => {
  const perRegion = {};
  const placed = [];
  for (const project of projects) {
    const code = regionCode(project.region) || '?';
    const hasExact = project.latitude != null && project.longitude != null;
    const index = hasExact ? 0 : (perRegion[code] = (perRegion[code] ?? -1) + 1);
    const position = placeProject(project, index);
    if (position) placed.push({ project, ...position });
  }
  return placed;
};
