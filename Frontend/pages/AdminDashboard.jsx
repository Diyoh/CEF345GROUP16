import React, { useState } from 'react';
import { useAppStore } from '../store';
import { UserRole } from '../types';
import { Navigate } from 'react-router-dom';
import { FinancialChart } from '../components/dashboard/FinancialChart';
import { CommentManager } from '../components/dashboard/CommentManager';
import { ProjectTable } from '../components/dashboard/ProjectTable';
import { ProjectModal } from '../components/dashboard/ProjectModal';

export const AdminDashboard = () => {
    const { user, projects, comments, updateProject, addProject, deleteComment } = useAppStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);

    if (!user || user.role !== UserRole.ADMIN) return <Navigate to="/login" />;

    const handleSave = (e, images) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const newProject = {
            id: editingProject ? editingProject.id : `p${Date.now()}`,
            title: formData.get('title'),
            location: formData.get('location'),
            budget: Number(formData.get('budget')),
            status: formData.get('status'),
            contractorName: formData.get('contractorName'),
            spent: editingProject ? editingProject.spent : 0,
            progress: editingProject ? editingProject.progress : 0,
            images: images, // Use the passed images array
            description: formData.get('description'),
            region: 'Centre',
            contractorId: 'u2',
            startDate: '2024-01-01',
            completionDate: '2025-01-01',
            updates: []
        };

        if (editingProject) updateProject({ ...editingProject, ...newProject });
        else addProject(newProject);

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
                <button
                    onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
                    className="bg-secondary hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition-all flex items-center gap-2"
                >
                    <i className="fas fa-plus"></i> New Project
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <FinancialChart projects={projects} />
                <CommentManager comments={comments} onDelete={deleteComment} />
            </div>

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
            />
        </div>
    );
};
