import React, { useState } from 'react';
import { useAppStore } from '../store';
import { UserRole } from '../types';
import { Navigate } from 'react-router-dom';
import { ContractorProjectCard } from '../components/dashboard/ContractorProjectCard';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

export const ContractorDashboard = () => {
    const { user, projects, updateProject } = useAppStore();
    const [editingId, setEditingId] = useState(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    if (!user || user.role !== UserRole.CONTRACTOR) return <Navigate to="/login" />;

    // [FIX] Handle both camelCase (from Socket/Optimistic) and snake_case (from DB)
    const myProjects = projects.filter(p => (p.contractorId === user.id) || (p.contractor_id === user.id));

    const handleUpdate = (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const projectId = formData.get('id');
        const project = myProjects.find(p => p.id === projectId);

        if (project) {
            const newSpent = Number(formData.get('spent'));
            const newProgress = Number(formData.get('progress'));
            const status = formData.get('status');
            const description = formData.get('description');

            // Handle Image Upload
            const newImagesJson = formData.get('newImagesJSON');
            let newImages = [...project.images];

            if (newImagesJson) {
                try {
                    const uploadedImages = JSON.parse(newImagesJson);
                    newImages = [...newImages, ...uploadedImages];
                } catch (e) {
                    console.error("Failed to parse images", e);
                }
            }

            updateProject({
                ...project,
                spent: newSpent,
                progress: newProgress,
                status: status,
                description: description,
                images: newImages
            });
        }
        setEditingId(null);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-dark mb-2">Contractor Portal</h1>
                    <p className="text-gray-500">Welcome back, <span className="font-bold text-primary">{user.name}</span>. Manage your assigned projects below.</p>
                </div>
                <button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
                >
                    <i className="fas fa-key"></i> Change Password
                </button>
            </div>

            {myProjects.length === 0 ? (
                <div className="bg-white p-16 text-center rounded-xl border-2 border-dashed border-gray-300">
                    <i className="fas fa-folder-open text-4xl text-gray-300 mb-4"></i>
                    <p className="text-gray-500 font-medium">No projects currently assigned to you.</p>
                    <p className="text-sm text-gray-400 mt-2">Contact the administrator if this is an error.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {myProjects.map(p => (
                        <ContractorProjectCard
                            key={p.id}
                            project={p}
                            isEditing={editingId === p.id}
                            onEditClick={() => setEditingId(p.id)}
                            onCancelEdit={() => setEditingId(null)}
                            onSave={handleUpdate}
                        />
                    ))}
                </div>
            )}

            <ChangePasswordModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
            />
        </div>
    );
};
