import React from 'react';
import { Comment } from '../../types';

interface CommentManagerProps {
  comments: Comment[];
  onDelete: (id: string) => void;
}

/**
 * CommentManager Component
 * 
 * Displays a list of recent comments with the ability to delete them.
 * Used by admins to moderate user-generated content.
 * 
 * @param comments - List of comments to display
 * @param onDelete - Handler function when delete is clicked
 */
export const CommentManager: React.FC<CommentManagerProps> = ({ comments, onDelete }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 overflow-y-auto">
      <h3 className="text-lg font-bold mb-4 text-red-600">Comment Moderation</h3>
      
      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm">
          <i className="fas fa-check-circle text-2xl mb-2 text-green-500"></i>
          <p>No comments to moderate.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="border-b pb-2 last:border-0 flex justify-between items-start group">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{c.authorName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    c.authorType === 'NGO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {c.authorType}
                  </span>
                </div>
                <p className="text-xs text-gray-600 italic mt-1">"{c.text}"</p>
                <p className="text-[10px] text-gray-400 mt-1">Project ID: {c.projectId}</p>
              </div>
              <button 
                onClick={() => onDelete(c.id)} 
                className="text-red-500 hover:text-white hover:bg-red-500 border border-red-200 px-3 py-1 rounded text-xs transition-colors"
                title="Delete this comment"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};