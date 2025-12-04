import React from 'react';
import { Link } from 'react-router-dom';
import { Project, ProjectStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatCurrency } from '../utils/helpers';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const progress = Math.min((project.spent / project.budget) * 100, 100);
  // Get main image (first in array) or fallback
  const coverImage = project.images.length > 0 
    ? project.images[0] 
    : `https://picsum.photos/seed/${project.id}/800/600`;

  return (
    <Link to={`/project/${project.id}`} className="block h-full">
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden h-full flex flex-col">
        <div className="h-48 overflow-hidden relative">
          <img src={coverImage} alt={project.title} className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2">
            <StatusBadge status={project.status} />
          </div>
          {project.images.length > 1 && (
             <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md">
                <i className="fas fa-camera mr-1"></i> {project.images.length}
             </div>
          )}
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2">{project.title}</h3>
          <p className="text-gray-500 text-sm mb-4"><i className="fas fa-map-marker-alt mr-1"></i> {project.location}, {project.region}</p>
          
          <div className="mt-auto">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Budget Spent</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full ${project.status === ProjectStatus.STALLED ? 'bg-red-500' : 'bg-primary'}`} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-gray-900">{formatCurrency(project.budget)}</span>
              <span className="text-gray-400">View Details &rarr;</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};