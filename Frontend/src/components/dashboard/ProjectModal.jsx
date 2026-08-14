import React, { useState, useEffect } from 'react';
import { ProjectStatus } from '../../types';
import { Modal, Button, Input, Textarea, Select, DateField, Card } from '../ui';

/**
 * Create and edit a project. Spec: docs/design/03-components.md sections 2 and 8.
 *
 * The save contract is unchanged: onSave(event, selectedFiles), with the form read via
 * FormData in the parent, so every field keeps its exact `name`.
 *
 * Two fixes:
 *  1. The old markup called makeMainImage(idx) from an onClick, but that function was
 *     never defined. Clicking "Set Main" threw a ReferenceError. Rather than invent a
 *     reordering contract the API does not support, the control is gone and the rule is
 *     stated instead: the first photo is the cover.
 *  2. removeImage dropped the preview but left the File in selectedFiles, so a removed
 *     photo still uploaded. Previews and files are now removed together.
 */

const REGIONS = [
  'Adamaoua', 'Centre', 'East', 'Far North', 'Littoral',
  'North', 'North West', 'South', 'South West', 'West',
];

const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

export const ProjectModal = ({ isOpen, onClose, onSave, editingProject, contractors }) => {
  const [existingImages, setExistingImages] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setExistingImages(editingProject?.images || []);
    setNewPreviews([]);
    setSelectedFiles([]);
    setSaving(false);
  }, [isOpen, editingProject]);

  // Object URLs are revoked on unmount so previews do not leak memory across opens.
  useEffect(() => () => newPreviews.forEach((url) => URL.revokeObjectURL(url)), [newPreviews]);

  const handleImageUpload = (e) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
    setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeNewImage = (index) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(e, selectedFiles);
    setSaving(false);
  };

  const allPreviews = [
    ...existingImages.map((src) => ({ src, isNew: false })),
    ...newPreviews.map((src) => ({ src, isNew: true })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={editingProject ? 'Edit project' : 'New project'}
      description={
        editingProject ? 'Changes are published immediately.' : 'This project becomes public once created.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" variant="primary" loading={saving}>
            {editingProject ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          name="title"
          label="Project title"
          required
          defaultValue={editingProject?.title}
          placeholder="Regional highway construction"
        />

        <Textarea
          name="description"
          label="Description"
          required
          defaultValue={editingProject?.description}
          placeholder="What is being built, and what does it cover?"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="location" label="Town or city" required defaultValue={editingProject?.location} />
          <Select name="region" label="Region" required defaultValue={editingProject?.region || ''}>
            <option value="" disabled>
              Select a region
            </option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DateField
            name="startDate"
            label="Start date"
            defaultValue={toDateInput(editingProject?.startDate)}
          />
          <DateField
            name="completionDate"
            label="Expected completion"
            defaultValue={toDateInput(editingProject?.completionDate)}
            hint="Used to flag a project as delayed."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            name="contractorId"
            label="Contractor"
            required
            defaultValue={editingProject?.contractorId || ''}
          >
            <option value="" disabled>
              Select a contractor
            </option>
            {contractors?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select name="status" label="Status" defaultValue={editingProject?.status || ProjectStatus.PLANNED}>
            {Object.values(ProjectStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <Input
          name="budget"
          type="number"
          min="0"
          label="Budget (FCFA)"
          required
          defaultValue={editingProject?.budget}
          placeholder="0"
          className="tabular"
          hint="The full allocated amount, not the amount spent."
        />

        <Card variant="inset" padding="sm">
          <label htmlFor="project-photos" className="text-caption font-medium text-fg-secondary">
            Project photos
          </label>
          <p className="mt-1 text-caption text-fg-tertiary">The first photo is used as the cover.</p>
          <input
            id="project-photos"
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="mt-3 block w-full text-caption text-fg-tertiary file:mr-3 file:rounded-sm file:border file:border-input file:bg-canvas file:px-3 file:py-1.5 file:text-caption file:font-medium file:text-fg"
          />

          {allPreviews.length > 0 && (
            <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {allPreviews.map((img, idx) => (
                <li key={`${img.src}-${idx}`} className="relative aspect-photo overflow-hidden rounded-sm border border-line">
                  <img src={img.src} alt="" className="h-full w-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute left-1 top-1 rounded-xs bg-[rgb(var(--overlay)/0.65)] px-1.5 py-0.5 text-overline uppercase text-white">
                      Cover
                    </span>
                  )}
                  {img.isNew && (
                    <button
                      type="button"
                      onClick={() => removeNewImage(idx - existingImages.length)}
                      aria-label={`Remove photo ${idx + 1}`}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger-fill text-caption text-danger-fg"
                    >
                      <i className="fas fa-xmark" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </form>
    </Modal>
  );
};
