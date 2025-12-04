import React from 'react';
import { Project } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { formatCurrency } from '../../utils/helpers';

interface ProjectTableProps {
  projects: Project[];
  onEdit: (project: Project) => void;
}

/**
 * ProjectTable Component
 * 
 * Renders a data table showing key details of all projects.
 * Includes an edit action for each row.
 * 
 * @param projects - Array of projects to list
 * @param onEdit - Callback when the edit button is clicked
 */
export const ProjectTable: React.FC<ProjectTableProps> = ({ projects, onEdit }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Project Title</th>
              <th className="px-6 py-4">Contractor</th>
              <th className="px-6 py-4">Budget</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.length === 0 ? (
                <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">No projects found.</td>
                </tr>
            ) : (
                projects.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{p.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{p.contractorName}</td>
                      <td className="px-6 py-4 text-sm font-mono">{formatCurrency(p.budget)}</td>
                      <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => onEdit(p)}
                          className="text-primary hover:text-white hover:bg-primary border border-primary px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          <i className="fas fa-edit mr-1"></i> Edit
                        </button>
                      </td>
                    </tr>
                  ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};