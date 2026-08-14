import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../useAppStore';
import { UserRole } from '../types';
import { ContractorProjectCard } from '../components/dashboard/ContractorProjectCard';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { Button, EmptyState, StatTile, useToast } from '../components/ui';
import { formatMoney } from '../utils/helpers';
import { projectHealth } from '../utils/projectHealth';

/**
 * Contractor portal. Spec: docs/design/02-ia-ux.md section 3.2.
 *
 * Ordered by urgency rather than insertion: anything not updated in 7 or more days comes
 * first, then the nearest deadline. A contractor's real question is "what do I owe an
 * update on", and answering it used to require reading every card.
 *
 * The update handler is unchanged: same FormData fields, same image merge, same
 * updateProject call.
 */
export const ContractorDashboard = () => {
  const { user, projects, updateProject } = useAppStore();
  const [editingId, setEditingId] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const toast = useToast();

  if (!user || user.role !== UserRole.CONTRACTOR) return <Navigate to="/login" replace />;

  const myProjects = useMemo(
    () => projects.filter((p) => p.contractorId === user.id || p.contractor_id === user.id),
    [projects, user.id]
  );

  const staleMs = 7 * 24 * 60 * 60 * 1000;
  const sorted = useMemo(() => {
    const isStale = (p) => {
      const updated = p.updatedAt || p.updated_at;
      return !updated || Date.now() - new Date(updated).getTime() > staleMs;
    };
    return [...myProjects].sort((a, b) => {
      if (isStale(a) !== isStale(b)) return isStale(a) ? -1 : 1;
      const aDue = new Date(a.completionDate || a.completion_date || 0).getTime();
      const bDue = new Date(b.completionDate || b.completion_date || 0).getTime();
      return aDue - bDue;
    });
  }, [myProjects]);

  const totals = useMemo(() => {
    const budget = myProjects.reduce((acc, p) => acc + (Number(p.budget) || 0), 0);
    const needsUpdate = myProjects.filter((p) => {
      const updated = p.updatedAt || p.updated_at;
      return !updated || Date.now() - new Date(updated).getTime() > staleMs;
    }).length;
    const atRisk = myProjects.filter((p) => projectHealth(p).overBudget).length;
    return { budget, needsUpdate, atRisk };
  }, [myProjects]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const projectId = formData.get('id');
    const project = myProjects.find((p) => p.id === projectId);
    if (!project) return;

    const newImagesJson = formData.get('newImagesJSON');
    let newImages = Array.isArray(project.images) ? [...project.images] : [];
    if (newImagesJson) {
      try {
        const uploaded = JSON.parse(newImagesJson);
        if (Array.isArray(uploaded)) newImages = [...newImages, ...uploaded];
      } catch (err) {
        console.error('Failed to parse images', err);
      }
    }

    // The result must be awaited before claiming success. A rejected update — wrong
    // contractor, progress out of range — previously still showed "the public page now
    // shows your changes", so a contractor believed they had reported when the record
    // said otherwise.
    const result = await updateProject({
      ...project,
      spent: Number(formData.get('spent')),
      progress: Number(formData.get('progress')),
      status: formData.get('status'),
      description: formData.get('description'),
      images: newImages,
    });

    if (result && result.success) {
      setEditingId(null);
      toast.success('Progress updated. The public page now shows your changes.');
    } else {
      // The editor stays open so the contractor does not lose what they typed.
      toast.error(result?.error || 'Your update could not be saved. Your changes are still here.');
    }
  };

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-8 md:py-10">
      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-h1 text-fg">Your projects</h1>
          <p className="mt-1.5 text-body text-fg-secondary">
            {totals.needsUpdate > 0
              ? `${totals.needsUpdate} project${totals.needsUpdate > 1 ? 's need' : ' needs'} an update.`
              : 'Everything is up to date.'}
          </p>
        </div>
        <Button variant="ghost" size="md" onClick={() => setIsPasswordModalOpen(true)}>
          Change password
        </Button>
      </div>

      {myProjects.length > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatTile label="Assigned projects" value={myProjects.length} />
          <StatTile
            label="Portfolio value"
            value={formatMoney(totals.budget, 'compact')}
            exact={formatMoney(totals.budget, 'full')}
          />
          <StatTile
            label="Needing an update"
            value={totals.needsUpdate}
            delta={totals.atRisk > 0 ? `${totals.atRisk} over budget` : undefined}
            deltaTone="negative"
          />
        </div>
      )}

      {myProjects.length === 0 ? (
        <EmptyState
          icon="fa-folder-open"
          title="No projects are assigned to you yet"
          body="An administrator assigns projects to your account. Contact them if you were expecting one."
        />
      ) : (
        <ul className="flex flex-col gap-5">
          {sorted.map((p) => (
            <li key={p.id}>
              <ContractorProjectCard
                project={p}
                isEditing={editingId === p.id}
                onEditClick={() => setEditingId(p.id)}
                onCancelEdit={() => setEditingId(null)}
                onSave={handleUpdate}
              />
            </li>
          ))}
        </ul>
      )}

      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
    </div>
  );
};
