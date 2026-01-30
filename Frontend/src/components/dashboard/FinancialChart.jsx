import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export const FinancialChart = ({ projects }) => {
    // Transform project data for the chart
    const dataForChart = projects.map(p => ({
        name: p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title,
        Budget: p.budget,
        Spent: p.spent
    }));

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
            <h3 className="text-lg font-bold mb-4">Financial Overview</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataForChart} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                        formatter={(value) => new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF' }).format(value)}
                    />
                    <Legend />
                    <Bar dataKey="Budget" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Spent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
