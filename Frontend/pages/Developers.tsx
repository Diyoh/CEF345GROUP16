import React from 'react';
import { useAppStore } from '../store';

export const Developers: React.FC = () => {
  const { teamMembers } = useAppStore();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-dark mb-4">Meet the Team</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          The dedicated individuals behind BuildRight, working to bring transparency to infrastructure development.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {teamMembers.map(member => (
          <div key={member.id} className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100 hover:shadow-md transition-all">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-gray-50">
              <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
            <span className="text-primary text-sm font-medium block mb-3">{member.role}</span>
            <p className="text-gray-600 text-sm">{member.bio}</p>
          </div>
        ))}
      </div>
    </div>
  );
};