import React, { useState } from 'react';
import { useAppStore } from '../useAppStore';
import { UserRole } from '../types';
import { Navigate } from 'react-router-dom';
import { FinancialChart } from '../components/dashboard/FinancialChart';
import { CommentManager } from '../components/dashboard/CommentManager';
import { ProjectTable } from '../components/dashboard/ProjectTable';
import { ProjectModal } from '../components/dashboard/ProjectModal';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { ContractorList } from '../components/dashboard/ContractorList';
import { ContractorAnalyticsModal } from '../components/dashboard/ContractorAnalyticsModal';
import { StatusModal } from '../components/dashboard/StatusModal';

export const AdminDashboard = () => {
    const { user, projects, comments, contractors, updateProject, addProject, deleteComment } = useAppStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [selectedContractorId, setSelectedContractorId] = useState(null); 
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    
    // [NEW] Status Modal State
    const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'success', message: '' });

    if (!user || user.role !== UserRole.ADMIN) return <Navigate to="/login" />;

    const handleSave = async (e, files) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        
        const selectedId = formData.get('contractorId');
        const selectedContractor = contractors.find(c => c.id === selectedId);

        formData.delete('images'); 
        
        if (files && files.length > 0) {
            files.forEach(file => {
                formData.append('images', file);
            });
        }

        // [FIX] Add default values for required fields not in the form
        // Region is now in the form, so we don't default it.
        // Start/End Dates are also in the form, but we can keep defaults if they are empty
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
            region: 'Centre',
            spent: editingProject ? editingProject.spent : 0,
            progress: editingProject ? editingProject.progress : 0,
            images: [],
            startDate: '2024-01-01',
            completionDate: '2025-01-01',
            updates: []
        };

        let result;
        if (editingProject) {
             result = await updateProject(optimisticProject, formData);
        } else {
             result = await addProject(optimisticProject, formData);
        }

        if (result && result.success) {
            setStatusModal({
                isOpen: true,
                type: 'success',
                message: editingProject ? 'Project updated successfully!' : 'Project created successfully!'
            });
            setIsModalOpen(false);
            setEditingProject(null);
        } else {
             setStatusModal({
                isOpen: true,
                type: 'error',
                message: result?.error || 'Failed to save project.'
            });
            // Keep editor open so user can retry
        }
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

            <ContractorAnalyticsModal 
                contractorId={selectedContractorId} 
                onClose={() => setSelectedContractorId(null)} 
            />

            <ChangePasswordModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
            />

            {/* [NEW] Status Modal */}
            <StatusModal 
                isOpen={statusModal.isOpen} 
                onClose={() => setStatusModal({ ...statusModal, isOpen: false })} 
                type={statusModal.type}
                message={statusModal.message}
            />
        </div>
    );
};
