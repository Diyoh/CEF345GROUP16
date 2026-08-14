import React from 'react';
import { useAppStore } from '../../useAppStore';
import { PageHeader } from '../../components/layout/AdminLayout';
import { AccessCodeManager } from '../../components/dashboard/AccessCodeManager';
import { useT } from '../../i18n';

export const DevAccess = () => {
  const t = useT();
  const { accessCodes, generateAccessCode } = useAppStore();

  return (
    <>
      <PageHeader
        title={t('admin.accessCodes')}
        description={t('admin.accessCodesLead')}
      />
      <AccessCodeManager accessCodes={accessCodes} onGenerate={generateAccessCode} />
    </>
  );
};
