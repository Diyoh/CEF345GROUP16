import React, { useState } from 'react';
import { ProjectStatus } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { Card, Button, Input, Textarea, Select, Meter, Modal } from '../ui';
import { formatMoney, formatDate, fileToBase64 } from '../../utils/helpers';
import { projectHealth } from '../../utils/projectHealth';

/**
 * Contractor task row. Spec: docs/design/02-ia-ux.md section 3.2.
 *
 * The update form was an inline block of five controls inside a card, which on a 360px
 * phone put the submit button underneath the keyboard. It is now a sheet: full screen on
 * mobile, dialog on desktop, with the primary action pinned above the safe area.
 *
 * The save contract is unchanged. The parent still reads FormData for id, spent, progress,
 * status, description and newImagesJSON, so the hidden JSON input stays, but it is now a
 * declared field rather than a DOM node appended during submit.
 *
 * Also fixes a crash: project.images was read unconditionally and threw for any project
 * without an images array.
 */
export const ContractorProjectCard = ({ project, isEditing, onEditClick, onCancelEdit, onSave }) => {
  const [newPhotos, setNewPhotos] = useState([]);
  const images = Array.isArray(project.images) ? project.images : [];
  const health = projectHealth(project);
  const cover = images[0] || null;

  const handlePhotoSelect = async (e) => {
    if (!e.target.files) return;
    const photos = [];
    for (let i = 0; i < e.target.files.length; i += 1) {
      photos.push(await fileToBase64(e.target.files[i]));
    }
    setNewPhotos(photos);
  };

  const handleSubmit = (e) => {
    onSave(e);
    setNewPhotos([]);
  };

  return (
    <>
      <Card padding="lg">
        <div className="flex flex-col gap-5 md:flex-row">
          <div className="w-full shrink-0 md:w-56">
            <div className="relative aspect-photo overflow-hidden rounded-md bg-sunken">
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  width="400"
                  height="300"
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-fg-tertiary">
                  <i className="fas fa-image text-h3" aria-hidden="true" />
                </div>
              )}
              {images.length > 1 && (
                <span className="tabular absolute bottom-2 right-2 rounded-xs bg-[rgb(var(--overlay)/0.65)] px-1.5 py-0.5 text-caption text-white">
                  {images.length} photos
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-h3 text-fg">{project.title}</h2>
              <StatusBadge project={project} size="sm" />
            </div>

            <p className="mt-1 text-caption text-fg-tertiary">
              {project.location}
              {health.completionDate ? ` · Due ${formatDate(health.completionDate)}` : ''}
            </p>

            <div className="mt-4 max-w-md">
              <Meter health={health} variant="dual" size="md" />
            </div>

            <Button
              variant="primary"
              size="lg"
              className="mt-5"
              onClick={onEditClick}
              leadingIcon={<i className="fas fa-pen-to-square" aria-hidden="true" />}
            >
              Update progress
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={isEditing}
        onClose={onCancelEdit}
        size="sm"
        title="Update progress"
        description={project.title}
        footer={
          <>
            <Button variant="ghost" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button type="submit" form={`update-${project.id}`} variant="primary" size="lg">
              Save update
            </Button>
          </>
        }
      >
        <form id={`update-${project.id}`} onSubmit={handleSubmit} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={project.id} />
          <input type="hidden" name="newImagesJSON" value={JSON.stringify(newPhotos)} />

          <Input
            name="progress"
            type="number"
            min="0"
            max="100"
            label="Work completed (%)"
            defaultValue={project.progress}
            className="tabular"
            hint="How much of the physical work is finished."
          />

          <Input
            name="spent"
            type="number"
            min="0"
            label="Total spent (FCFA)"
            defaultValue={project.spent}
            className="tabular"
            hint={`Budget is ${formatMoney(health.budget, 'full')}.`}
          />

          <Select name="status" label="Status" defaultValue={project.status}>
            {Object.values(ProjectStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>

          <Textarea
            name="description"
            label="Progress note"
            defaultValue={project.description}
            rows={3}
            hint="This is published on the public project page."
          />

          {/* Appends to the project's public timeline. The description above is the
              project's CURRENT state and is overwritten each time; this is the dated
              record of what changed, which is what an auditor reads back. */}
          <Textarea
            name="timelineNote"
            label="Add to update history"
            rows={2}
            placeholder="What changed since your last update?"
            hint="Optional. Posted with today's date and kept permanently — earlier entries are never overwritten."
          />

          <div>
            <label htmlFor={`photos-${project.id}`} className="mb-1.5 block text-caption font-medium text-fg-secondary">
              Site photos
            </label>
            <input
              id={`photos-${project.id}`}
              type="file"
              multiple
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="block w-full text-caption text-fg-tertiary file:mr-3 file:rounded-sm file:border file:border-input file:bg-canvas file:px-3 file:py-1.5 file:text-caption file:font-medium file:text-fg"
            />
            {newPhotos.length > 0 && (
              <p className="mt-1.5 text-caption text-progress-fg">
                {newPhotos.length} photo{newPhotos.length > 1 ? 's' : ''} ready to upload
              </p>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
};
