import React, { useState } from 'react';
import { useAppStore } from '../store';
import { UserRole } from '../types';
import { Navigate } from 'react-router-dom';
import { AccessCodeManager } from '../components/dashboard/AccessCodeManager';
import { TeamManager } from '../components/dashboard/TeamManager';

/**
 * DeveloperDashboard Page
 * 
 * Internal tool for the BuildRight team to manage platform access
 * and update "About Us" information.
 */
export const DeveloperDashboard: React.FC = () => {
    const { user, teamMembers, updateTeamMember, accessCodes, generateAccessCode } = useAppStore();
    const [editingMember, setEditingMember] = useState<any>(null);

    // Protected Route Check
    if (!user || user.role !== UserRole.DEVELOPER_ADMIN) return <Navigate to="/login" />;

    /**
     * Handle saving team member details
     */
    const handleSaveTeam = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (editingMember) {
            updateTeamMember({
                ...editingMember,
                name: formData.get('name') as string,
                role: formData.get('role') as string,
                bio: formData.get('bio') as string,
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