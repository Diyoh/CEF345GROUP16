import React, { useState } from 'react';
import { useAppStore } from '../../useAppStore';
import { PageHeader } from '../../components/layout/AdminLayout';
import { TeamManager } from '../../components/dashboard/TeamManager';
import { useToast } from '../../components/ui';

export const DevTeam = () => {
  const { teamMembers, updateTeamMember } = useAppStore();
  const [editingMember, setEditingMember] = useState(null);
  const toast = useToast();

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!editingMember) return;

    updateTeamMember({
      ...editingMember,
      name: formData.get('name'),
      role: formData.get('role'),
      bio: formData.get('bio'),
    });
    setEditingMember(null);
    toast.success('Team member updated.');
  };

  return (
    <>
      <PageHeader title="Team" description="Shown on the public About page." />
      <TeamManager
        members={teamMembers}
        editingMember={editingMember}
        onEditClick={setEditingMember}
        onCancelEdit={() => setEditingMember(null)}
        onSave={handleSave}
      />
    </>
  );
};
