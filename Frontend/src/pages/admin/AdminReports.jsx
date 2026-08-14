import React from 'react';
import { useAppStore } from '../../useAppStore';
import { PageHeader } from '../../components/layout/AdminLayout';
import { CommentManager } from '../../components/dashboard/CommentManager';
import { useT } from '../../i18n';

export const AdminReports = () => {
  const t = useT();
  const { comments, deleteComment } = useAppStore();

  return (
    <>
      <PageHeader
        title={t('admin.citizenReports')}
        description={t('admin.citizenReportsLead')}
      />
      <CommentManager comments={comments} onDelete={deleteComment} />
    </>
  );
};
