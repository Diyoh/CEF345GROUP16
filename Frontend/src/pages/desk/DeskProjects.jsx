import React from 'react';
import { useAppStore } from '../../useAppStore';
import { AdminProjects } from '../admin/AdminProjects';

/**
 * The entity administrator's project desk.
 *
 * A thin scope around the platform admin's project surface: same table, same
 * modal, same save path, filtered to the administrator's own institution and
 * with ownership forced to it. The real enforcement lives in the project
 * service; this only makes the screen show the truth of that rule.
 */
export const DeskProjects = () => {
  const { user } = useAppStore();

  const owner = {
    id: user.entityId,
    type: user.entityType,
    code: user.entityCode,
    nameEn: user.entityNameEn,
    nameFr: user.entityNameFr,
  };

  return <AdminProjects owner={owner} />;
};
