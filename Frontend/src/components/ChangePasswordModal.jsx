import React, { useState } from 'react';
import { useAppStore } from '../useAppStore';

export const ChangePasswordModal = ({ isOpen, onClose }) => {
    const { changePassword } = useAppStore();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            setError("New password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        const res = await changePassword(currentPassword, newPassword);
        setLoading(false);

        if (res.success) {
            setMessage("Password updated successfully.");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                onClose();
                setMessage('');
            }, 1500);
        } else {
            setError(res.error || "Failed to update password");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {message && <div className="bg-green-100 text-green-700 p-3 rounded text-sm text-center">{message}</div>}
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm text-center">{error}</div>}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Current Password</label>
                        <input
                            type="password"
                            required
                            className="w-full border p-2 rounded focus:outline-none focus:border-primary"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                        <input
                            type="password"
                            required
                            className="w-full border p-2 rounded focus:outline-none focus:border-primary"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            required
                            className="w-full border p-2 rounded focus:outline-none focus:border-primary"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-primary hover:bg-sky-600 text-white font-bold rounded shadow transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
