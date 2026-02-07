import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store';
// Helper to format large currency numbers
const formatCurrency = (amount) => {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B FCFA`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M FCFA`;
    return `${amount.toLocaleString()} FCFA`;
};

export const ContractorAnalyticsModal = ({ contractorId, onClose }) => {
    const { fetchContractorStats } = useAppStore();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (contractorId) {
            setLoading(true);
            fetchContractorStats(contractorId).then(statsData => {
                setData(statsData);
                setLoading(false);
            });
        }
    }, [contractorId]);

    if (!contractorId) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 break-words flex-1 pr-4">
                        {loading ? 'Loading...' : `Analytics: ${data?.contractor?.name}`}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div className="p-4 md:p-6">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <i className="fas fa-spinner fa-spin text-4xl text-primary"></i>
                        </div>
                    ) : data ? (
                        <>
                            {/* Key Metrics Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
                                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Total Projects</h4>
                                    <p className="text-2xl md:text-3xl font-extrabold text-gray-800">{data.stats.totalProjects}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100">
                                    <h4 className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Total Budget</h4>
                                    <p className="text-xl md:text-2xl font-extrabold text-gray-800 break-words">
                                        {formatCurrency(data.stats.totalBudget)}
                                    </p>
                                </div>
                                <div className="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-100">
                                    <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">Total Spent</h4>
                                    <p className="text-xl md:text-2xl font-extrabold text-gray-800 break-words">
                                        {formatCurrency(data.stats.totalSpent)}
                                    </p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg shadow-sm border border-purple-100">
                                    <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">Avg Progress</h4>
                                    <p className="text-2xl md:text-3xl font-extrabold text-gray-800">
                                        {Math.round(data.stats.avgProgress)}%
                                    </p>
                                </div>
                            </div>

                            {/* Current Projects List */}
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Current Projects</h3>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead>
                                        <tr className="bg-gray-50 border-b">
                                            <th className="p-3 text-xs uppercase font-bold text-gray-500">Project Title</th>
                                            <th className="p-3 text-xs uppercase font-bold text-gray-500">Status</th>
                                            <th className="p-3 text-xs uppercase font-bold text-gray-500 w-32">Progress</th>
                                            <th className="p-3 text-xs uppercase font-bold text-gray-500 text-right">Budget</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.projects.length > 0 ? (
                                            data.projects.map(p => (
                                                <tr key={p.id} className="border-b hover:bg-gray-50 last:border-0">
                                                    <td className="p-3 font-medium text-gray-800">{p.title}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold inline-block whitespace-nowrap ${
                                                            p.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                            p.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-full bg-gray-200 rounded-full h-2 flex-1">
                                                                <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${p.progress}%` }}></div>
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-600 w-8">{p.progress}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-gray-600 text-right whitespace-nowrap">
                                                        {formatCurrency(parseFloat(p.budget) || 0)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="4" className="p-4 text-center text-gray-500">No projects assigned.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <p className="text-red-500 text-center">Failed to load data.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
