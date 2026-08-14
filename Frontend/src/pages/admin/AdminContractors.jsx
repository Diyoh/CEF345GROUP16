import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/AdminLayout';
import { ContractorList } from '../../components/dashboard/ContractorList';
import { ContractorAnalyticsModal } from '../../components/dashboard/ContractorAnalyticsModal';

export const AdminContractors = () => {
  const [selectedContractorId, setSelectedContractorId] = useState(null);

  return (
    <>
      <PageHeader title="Contractors" description="Who is building what, and how their portfolio is tracking." />
      <ContractorList onSelect={setSelectedContractorId} />
      <ContractorAnalyticsModal
        contractorId={selectedContractorId}
        onClose={() => setSelectedContractorId(null)}
      />
    </>
  );
};
