export const UserRole = {
  PUBLIC: 'PUBLIC',
  // The key stays ADMIN so existing comparisons keep working; the stored value
  // is PLATFORM_ADMIN since migration 007 disambiguated it from entity admins.
  ADMIN: 'PLATFORM_ADMIN',
  ENTITY_ADMIN: 'ENTITY_ADMIN',
  CONTRACTOR: 'CONTRACTOR',
  DEVELOPER_ADMIN: 'DEVELOPER_ADMIN'
};

export const ProjectStatus = {
  PLANNED: 'Planned',
  ONGOING: 'Ongoing',
  STALLED: 'Stalled',
  COMPLETED: 'Completed'
};
