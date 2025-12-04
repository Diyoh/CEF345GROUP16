import React from 'react';
import { ProjectStatus } from '../types';

export const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  const colors = {
    [ProjectStatus.PLANNED]: 'bg-blue-100 text-blue-800',
    [ProjectStatus.ONGOING]: 'bg-yellow-100 text-yellow-800',
    [ProjectStatus.STALLED]: 'bg-red-100 text-red-800',
    [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
      {status}
    </span>
  );
};