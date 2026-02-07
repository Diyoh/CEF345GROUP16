import React, { useState } from 'react';
import { useAppStore } from '../store';
import { UserRole } from '../types';
import { Navigate } from 'react-router-dom';
import { FinancialChart } from '../components/dashboard/FinancialChart';
import { CommentManager } from '../components/dashboard/CommentManager';
import { ProjectTable } from '../components/dashboard/ProjectTable';
import { ProjectModal } from '../components/dashboard/ProjectModal';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { ContractorList } from '../components/dashboard/ContractorList';
import { ContractorAnalyticsModal } from '../components/dashboard/ContractorAnalyticsModal';

export const AdminDashboard = () => {
    const { user, projects, comments, contractors, updateProject, addProject, deleteComment } = useAppStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [selectedContractorId, setSelectedContractorId] = useState(null); 
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false); // [NEW]

    if (!user || user.role !== UserRole.ADMIN) return <Navigate to="/login" />;

    const handleSave = (e, files) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        
        // Find selected contractor name for display (Optimistic UI)
        const selectedId = formData.get('contractorId');
        const selectedContractor = contractors.find(c => c.id === selectedId);

        // [FIX] We need to reconstruct the FormData because we might have extra fields 
        // or we need to append the files manually if they weren't input fields.
        // Actually, 'new FormData(form)' captures all inputs. 
        // We just need to append the files carefully.
        
        // Remove 'images' if it exists in the form to avoid duplicates or empty inputs
        formData.delete('images'); 
        
        // Append actual File objects
        if (files && files.length > 0) {
            files.forEach(file => {
                formData.append('images', file);
            });
        }

        // Optimistic Object (for display while uploading)
        const optimisticProject = {
            id: editingProject ? editingProject.id : `p${Date.now()}`,
            title: formData.get('title'),
            location: formData.get('location'),
            budget: Number(formData.get('budget')),
            status: formData.get('status'),
            contractorId: selectedId,
            contractorName: selectedContractor ? selectedContractor.name : 'Unknown',
            description: formData.get('description'),
            region: 'Centre',
            spent: editingProject ? editingProject.spent : 0,
            progress: editingProject ? editingProject.progress : 0,
            images: [], // Optimistically empty or show previews if we passed them
            startDate: '2024-01-01',
            completionDate: '2025-01-01',
            updates: []
        };

        // Note: updateProject/addProject in store.jsx now handle FormData
        // But store functions expect an OBJECT for the optimistic update, and FormData for the API call? 
        // The store functions currently take just 'newProject'. 
        // We need to refactor store.jsx one more time to handle { optimistic, formData }.
        // OR, we just pass the FormData to the API, and use the optimistic object for the state.
        
        // Let's modify the store call to take two arguments or handle strict FormData.
        // Simpler for now: Pass Object to store (for optimistic), but use FormData in API.
        // Actually, we should update the Store first.
        
        // Wait, 'addProject' in store calls 'api.createProject(newProject)'.
        // If we pass FormData to 'addProject', 'setProjects' will try to put FormData in the state array, which breaks the UI.
        
        // So we MUST separate them.
        if (editingProject) {
             updateProject(optimisticProject, formData);
        } else {
             addProject(optimisticProject, formData);
        }

        setIsModalOpen(false);
        setEditingProject(null);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-dark">Admin Dashboard</h1>
                    <p className="text-gray-500 mt-1">Manage projects and oversee platform activity.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                    >
                        <i className="fas fa-key"></i> Change Password
                    </button>
                    <button
                        onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
                        className="bg-secondary hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition-all flex items-center gap-2"
                    >
                        <i className="fas fa-plus"></i> New Project
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <FinancialChart projects={projects} />
                <CommentManager comments={comments} onDelete={deleteComment} />
            </div>

            {/* [NEW] Contractor Analytics Section */}
            <ContractorList onSelect={setSelectedContractorId} />

            <h3 className="text-xl font-bold text-gray-800 mb-4">Project Management</h3>
            <ProjectTable
                projects={projects}
                onEdit={(p) => { setEditingProject(p); setIsModalOpen(true); }}
            />

            <ProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                editingProject={editingProject}
                contractors={contractors}
            />

            {/* [NEW] Analytics Modal */}
            <ContractorAnalyticsModal 
                contractorId={selectedContractorId} 
                onClose={() => setSelectedContractorId(null)} 
            />

            <ChangePasswordModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
            />
        </div>
    );
};
