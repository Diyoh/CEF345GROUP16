import React from 'react';
import { useAppStore } from '../../useAppStore';
import { PageHeader } from '../../components/layout/AdminLayout';
import { CommentManager } from '../../components/dashboard/CommentManager';

export const AdminReports = () => {
  const { comments, deleteComment } = useAppStore();

  return (
    <>
      <PageHeader
        title="Citizen reports"
        description="Reports submitted by the public on project pages."
      />
      <CommentManager comments={comments} onDelete={deleteComment} />
    </>
  );
};
