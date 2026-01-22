import React, { useState } from 'react';
import { useAppStore } from '../store';
import { UserRole } from '../types';
import { Navigate } from 'react-router-dom';
import { AccessCodeManager } from '../components/dashboard/AccessCodeManager';
import { TeamManager } from '../components/dashboard/TeamManager';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

export const DeveloperDashboard = () => {
    const { user, teamMembers, updateTeamMember, accessCodes, generateAccessCode } = useAppStore();
    const [editingMember, setEditingMember] = useState(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Protected Route Check
    if (!user || user.role !== UserRole.DEVELOPER_ADMIN) return <Navigate to="/login" />;

    const handleSaveTeam = (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (editingMember) {
            updateTeamMember({
                ...editingMember,
                name: formData.get('name'),
                role: formData.get('role'),
                bio: formData.get('bio'),
            });
            setEditingMember(null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-dark mb-2">Developer Control Panel</h1>
                    <p className="text-gray-500">Generate access codes and manage platform team members.</p>
                </div>
                <button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
                >
                    <i className="fas fa-key"></i> Change Password
                </button>
            </div>

            {/* Access Code Management Section */}
            <AccessCodeManager
                accessCodes={accessCodes}
                onGenerate={generateAccessCode}
            />

            {/* Team Management Section */}
            <TeamManager
                members={teamMembers}
                editingMember={editingMember}
                onEditClick={setEditingMember}
                onCancelEdit={() => setEditingMember(null)}
                onSave={handleSaveTeam}
            />

            <ChangePasswordModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
            />
        </div>
    );
};
