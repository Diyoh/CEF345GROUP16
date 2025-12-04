import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus } from '../../types';
import { fileToBase64 } from '../../utils/helpers';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>, images: string[]) => void;
  editingProject: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSave, editingProject }) => {
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && editingProject) {
      setCurrentImages(editingProject.images || []);
    } else if (isOpen) {
      setCurrentImages([]);
    }
  }, [isOpen, editingProject]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const base64 = await fileToBase64(e.target.files[i]);
        newImages.push(base64);
      }
      setCurrentImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setCurrentImages(prev => prev.filter((_, i) => i !== index));
  };

  const makeMainImage = (index: number) => {
    setCurrentImages(prev => {
      const newArr = [...prev];
      const selected = newArr.splice(index, 1)[0];
      newArr.unshift(selected); // Move to front
      return newArr;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      onSave(e, currentImages);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {editingProject ? 'Edit Project Details' : 'Create New Project'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
            <input 
                name="title" 
                required 
                defaultValue={editingProject?.title} 
                placeholder="e.g., Regional Highway Construction" 
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
                name="description" 
                required 
                defaultValue={editingProject?.description} 
                placeholder="Detailed description of the project scope..." 
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none h-24" 
            />
          </div>

          {/* Image Upload Section */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
             <label className="block text-sm font-bold text-gray-700 mb-2">Project Photos</label>
             <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white file:text-primary hover:file:bg-gray-100"
             />
             <p className="text-xs text-gray-400 mt-1">First image will be the main cover.</p>
             
             {currentImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                    {currentImages.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square rounded overflow-hidden border border-gray-300">
                            <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                            {idx === 0 && <span className="absolute top-0 left-0 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-br font-bold z-10">Main</span>}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                {idx !== 0 && (
                                    <button type="button" onClick={() => makeMainImage(idx)} className="text-white text-xs hover:text-secondary underline">Set Main</button>
                                )}
                                <button type="button" onClick={() => removeImage(idx)} className="text-red-400 text-xs hover:text-red-200 underline">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
             )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input 
                    name="location" 
                    required 
                    defaultValue={editingProject?.location} 
                    placeholder="City/Town" 
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" 
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contractor Name</label>
                <input 
                    name="contractorName" 
                    required 
                    defaultValue={editingProject?.contractorName} 
                    placeholder="Company Name" 
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" 
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget (XAF)</label>
                <input 
                    type="number" 
                    name="budget" 
                    required 
                    defaultValue={editingProject?.budget} 
                    placeholder="0" 
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" 
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                <select 
                    name="status" 
                    defaultValue={editingProject?.status || ProjectStatus.PLANNED} 
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                >
                    {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
            <button 
                type="button" 
                onClick={onClose} 
                className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                type="submit" 
                className="px-5 py-2 bg-primary hover:bg-sky-600 text-white font-bold rounded-lg shadow-sm transition-colors"
            >
                {editingProject ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};