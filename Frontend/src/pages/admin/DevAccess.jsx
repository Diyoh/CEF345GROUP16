import React from 'react';
import { useAppStore } from '../../useAppStore';
import { PageHeader } from '../../components/layout/AdminLayout';
import { AccessCodeManager } from '../../components/dashboard/AccessCodeManager';

export const DevAccess = () => {
  const { accessCodes, generateAccessCode } = useAppStore();

  return (
    <>
      <PageHeader
        title="Access codes"
        description="Invite administrators, contractors and developers to the platform."
      />
      <AccessCodeManager accessCodes={accessCodes} onGenerate={generateAccessCode} />
    </>
  );
};
