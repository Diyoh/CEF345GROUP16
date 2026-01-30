import React, { useEffect } from 'react';
import { useAppStore } from '../../useAppStore';

export const ContractorList = ({ onSelect }) => {
    const { contractors, fetchContractors } = useAppStore();

    useEffect(() => {
        fetchContractors();
    }, []);

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Registered Contractors</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-3 text-sm font-semibold text-gray-600">Name</th>
                            <th className="p-3 text-sm font-semibold text-gray-600">Email</th>
                            <th className="p-3 text-sm font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contractors.length > 0 ? (
                            contractors.map(contractor => (
                                <tr key={contractor.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-800">{contractor.name}</td>
                                    <td className="p-3 text-gray-600">{contractor.email}</td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => onSelect(contractor.id)}
                                            className="bg-primary hover:bg-sky-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                        >
                                            View Analytics
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" className="p-4 text-center text-gray-500">
                                    No contractors found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
