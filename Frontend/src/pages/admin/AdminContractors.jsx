import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/AdminLayout';
import { ContractorList } from '../../components/dashboard/ContractorList';
import { ContractorAnalyticsModal } from '../../components/dashboard/ContractorAnalyticsModal';
import { useT } from '../../i18n';

export const AdminContractors = () => {
  const t = useT();
  const [selectedContractorId, setSelectedContractorId] = useState(null);

  return (
    <>
      <PageHeader title={t('admin.contractors')} description={t('admin.contractorsLead')} />
      <ContractorList onSelect={setSelectedContractorId} />
      <ContractorAnalyticsModal
        contractorId={selectedContractorId}
        onClose={() => setSelectedContractorId(null)}
      />
    </>
  );
};
