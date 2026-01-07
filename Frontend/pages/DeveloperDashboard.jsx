import React, { useState } from 'react';
import { useAppStore } from '../store';
import { UserRole } from '../types';
import { Navigate } from 'react-router-dom';
import { AccessCodeManager } from '../components/dashboard/AccessCodeManager';
import { TeamManager } from '../components/dashboard/TeamManager';

export const DeveloperDashboard = () => {
    const { user, teamMembers, updateTeamMember, accessCodes, generateAccessCode } = useAppStore();
    const [editingMember, setEditingMember] = useState(null);

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
            <h1 className="text-3xl font-bold text-dark mb-8">Developer Control Panel</h1>

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
        </div>
    );
};
