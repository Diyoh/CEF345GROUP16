import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../../useAppStore';
import { PageHeader } from '../../components/layout/AdminLayout';
import { ProjectTable } from '../../components/dashboard/ProjectTable';
import { ProjectModal } from '../../components/dashboard/ProjectModal';
import { Button, Select, EmptyState, useToast } from '../../components/ui';
import { ProjectStatus } from '../../types';
import { byVarianceAsc } from '../../utils/projectHealth';

/**
 * Project management. The admin's primary work object, now its own route and the default
 * landing for returning admins, instead of sitting below a chart, a comment feed and a
 * contractor list.
 *
 * The save handler is unchanged from the old AdminDashboard: same FormData assembly, same
 * optimistic object, same addProject/updateProject calls. Only the feedback changed, from
 * a blocking modal on every save to a toast.
 */
export const AdminProjects = ({ owner = null }) => {
  const { projects, contractors, updateProject, addProject, fetchContractors } = useAppStore();

  // The contractor list previously filled only after visiting the Contractors
  // page, leaving this form's dropdown empty on a fresh session.
  useEffect(() => {
    fetchContractors();
  }, []);
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const searchRef = useRef(null);

  // "/" focuses search, "n" opens a new project. Cheap, and they cover most of what a
  // command palette would have done on a surface this size.
  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'n') {
        e.preventDefault();
        setEditingProject(null);
        setIsModalOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return projects
      .filter((p) => !owner || p.ownerEntity?.id === owner.id)
      .filter((p) => {
        const matchesSearch =
          !term || p.title?.toLowerCase().includes(term) || p.location?.toLowerCase().includes(term);
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort(byVarianceAsc);
  }, [projects, search, statusFilter, owner]);

  const handleSave = async (e, files) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const selectedId = formData.get('contractorId');
    const selectedContractor = contractors.find((c) => c.id === selectedId);

    formData.delete('images');
    if (files && files.length > 0) files.forEach((file) => formData.append('images', file));

    if (!formData.get('startDate')) formData.append('startDate', new Date().toISOString().split('T')[0]);
    if (!formData.get('completionDate')) {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      formData.append('completionDate', nextYear.toISOString().split('T')[0]);
    }

    const optimisticProject = {
      id: editingProject ? editingProject.id : `p${Date.now()}`,
      title: formData.get('title'),
      location: formData.get('location'),
      budget: Number(formData.get('budget')),
      status: formData.get('status'),
      contractorId: selectedId,
      contractorName: selectedContractor ? selectedContractor.name : 'Unknown',
      description: formData.get('description'),
      region: formData.get('region') || 'Centre',
      spent: editingProject ? editingProject.spent : 0,
      progress: editingProject ? editingProject.progress : 0,
      images: editingProject ? editingProject.images || [] : [],
      startDate: formData.get('startDate'),
      completionDate: formData.get('completionDate'),
      updates: editingProject ? editingProject.updates || [] : [],
    };

    const result = editingProject
      ? await updateProject(optimisticProject, formData)
      : await addProject(optimisticProject, formData);

    if (result && result.success) {
      toast.success(editingProject ? 'Project updated.' : 'Project created and published.');
      setIsModalOpen(false);
      setEditingProject(null);
    } else {
      // The editor stays open so the user does not lose what they typed.
      toast.error(result?.error || 'The project could not be saved. Your changes are still here.');
    }
  };

  return (
    <>
      <PageHeader
        title="Projects"
        description={`${projects.length} projects. Press n to add one.`}
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingProject(null);
              setIsModalOpen(true);
            }}
            leadingIcon={<i className="fas fa-plus" aria-hidden="true" />}
          >
            New project
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="admin-project-search" className="mb-1.5 block text-caption font-medium text-fg-secondary">
            Search
          </label>
          <input
            id="admin-project-search"
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Project or town"
            className="h-10 w-full rounded-sm border border-input bg-canvas px-3 text-body text-fg placeholder:text-fg-placeholder dark:bg-sunken"
          />
        </div>
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          fieldClassName="w-full sm:w-56"
        >
          <option value="All">All statuses</option>
          {Object.values(ProjectStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 && projects.length > 0 ? (
        <EmptyState
          icon="fa-filter-circle-xmark"
          title="No projects match this search"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setStatusFilter('All');
              }}
            >
              Clear search
            </Button>
          }
        />
      ) : (
        <ProjectTable
          projects={filtered}
          onEdit={(p) => {
            setEditingProject(p);
            setIsModalOpen(true);
          }}
        />
      )}

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSave}
        editingProject={editingProject}
        contractors={contractors}
        ownerEntity={owner}
      />
    </>
  );
};
