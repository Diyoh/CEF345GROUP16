import React, { useState } from 'react';
import { Project, ProjectStatus } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { formatCurrency, fileToBase64 } from '../../utils/helpers';

interface ContractorProjectCardProps {
  project: Project;
  isEditing: boolean;
  onEditClick: () => void;
  onCancelEdit: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const ContractorProjectCard: React.FC<ContractorProjectCardProps> = ({ 
  project, 
  isEditing, 
  onEditClick, 
  onCancelEdit, 
  onSave 
}) => {
  const [newPhotos, setNewPhotos] = useState<string[]>([]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
       const photos: string[] = [];
       for(let i=0; i<e.target.files.length; i++){
          const base64 = await fileToBase64(e.target.files[i]);
          photos.push(base64);
       }
       setNewPhotos(photos);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      // We manually append the base64 images to a hidden input or handle it in the parent
      // For simplicity, we'll let the parent pull it from the form if we serialize it, 
      // but standard FormData doesn't handle array of strings easily.
      // We will inject a hidden input with JSON string of images.
      e.preventDefault();
      // This is a bit hacky but works for the current structure without rewriting parent completely
      const form = e.currentTarget;
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = 'newImagesJSON';
      hiddenInput.value = JSON.stringify(newPhotos);
      form.appendChild(hiddenInput);
      onSave(e);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 transition-all hover:shadow-md">
      {/* Image Section */}
      <div className="w-full md:w-1/3">
         <div className="relative rounded-lg overflow-hidden mb-3 group h-48">
            <img 
              src={project.images[0] || `https://picsum.photos/seed/${project.id}/400/300`} 
              className="w-full h-full object-cover transform transition-transform group-hover:scale-105" 
              alt={project.title}
            />
            <div className="absolute top-2 right-2">
                <StatusBadge status={project.status} />
            </div>
            {project.images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    +{project.images.length - 1} more
                </div>
            )}
         </div>
         <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Progress</p>
            <div className="flex items-center justify-center gap-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{width: `${project.progress}%`}}></div>
                </div>
                <span className="font-bold text-dark">{project.progress}%</span>
            </div>
         </div>
      </div>

      {/* Details / Form Section */}
      <div className="flex-1">
        <h3 className="text-xl font-bold mb-2 text-gray-900">{project.title}</h3>
        
        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-gray-50 p-3 rounded-lg">
          <div>
            <span className="text-gray-500 block text-xs uppercase">Total Budget</span>
            <span className="font-bold text-gray-800">{formatCurrency(project.budget)}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase">Total Spent</span>
            <span className={`font-bold ${project.spent > project.budget ? 'text-red-500' : 'text-primary'}`}>
                {formatCurrency(project.spent)}
            </span>
          </div>
        </div>
        
        {isEditing ? (
          <form onSubmit={handleFormSubmit} className="bg-blue-50 p-4 rounded-lg mt-4 border border-blue-100 animate-fade-in">
            <input type="hidden" name="id" value={project.id} />
            <h4 className="text-sm font-bold text-blue-800 mb-3 border-b border-blue-200 pb-2">Update Project Status</h4>
            
            <div className="mb-4">
                <label className="block text-xs font-bold mb-1 text-gray-700">Project Description / Progress Note</label>
                <textarea 
                    name="description" 
                    defaultValue={project.description} 
                    className="w-full border p-2 rounded text-sm h-20 focus:ring-2 focus:ring-primary focus:outline-none" 
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700">Update Spend (XAF)</label>
                <input 
                    type="number" 
                    name="spent" 
                    defaultValue={project.spent} 
                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700">Progress (%)</label>
                <input 
                    type="number" 
                    name="progress" 
                    min="0" 
                    max="100" 
                    defaultValue={project.progress} 
                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700">Status</label>
                <select 
                    name="status" 
                    defaultValue={project.status} 
                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                >
                   {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold mb-1 text-gray-700">Upload New Site Photos</label>
              <input 
                type="file" 
                multiple
                accept="image/*" 
                onChange={handlePhotoSelect}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white file:text-primary hover:file:bg-gray-50 border rounded bg-white"
            />
            {newPhotos.length > 0 && <p className="text-xs text-green-600 mt-1">{newPhotos.length} photos selected</p>}
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex-1"
              >
                <i className="fas fa-save mr-2"></i> Save Updates
              </button>
              <button 
                type="button" 
                onClick={onCancelEdit} 
                className="bg-white text-gray-600 hover:text-red-500 border border-gray-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
            <>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.description}</p>
                <button 
                    onClick={onEditClick}
                    className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-sky-600 transition-colors inline-flex items-center shadow-sm"
                >
                    <i className="fas fa-tools mr-2"></i> Modify Info & Report Progress
                </button>
            </>
        )}
      </div>
    </div>
  );
};