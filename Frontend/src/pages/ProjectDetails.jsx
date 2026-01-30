import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../useAppStore';
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency, fileToBase64 } from '../utils/helpers';
import { ProjectStatus } from '../types';

export const ProjectDetails = () => {
  const { id } = useParams();
  const { projects, comments, addComment, fetchProjectComments } = useAppStore();
  const project = projects.find(p => p.id === id);

  // Load comments when mounting
  useEffect(() => {
    if (id) {
        fetchProjectComments(id);
    }
  }, [id]); // Warning: depending on fetchProjectComments might cause loop if it changes identity. Store function should be stable.

  // Comment State
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorType, setAuthorType] = useState('Citizen');
  const [commentImages, setCommentImages] = useState([]);
  
  // State to track which comment has its images expanded
  const [expandedCommentId, setExpandedCommentId] = useState(null);

  if (!project) return <div className="p-12 text-center">Project not found. If you just created it, it might take a moment to appear.</div>;

  const projectComments = comments.filter(c => c.projectId === project.id);
  // Ensure images is an array
  const galleryImages = project.images || [];

  const handleImageUpload = async (e) => {
    if (e.target.files) {
      if (e.target.files.length + commentImages.length > 4) {
          alert("You can upload a maximum of 4 photos per comment.");
          return;
      }
      
      const newImages = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const base64 = await fileToBase64(e.target.files[i]);
        newImages.push(base64);
      }
      setCommentImages(prev => [...prev, ...newImages]);
    }
  };

  const removeCommentImage = (index) => {
    setCommentImages(prev => prev.filter((_, i) => i !== index));
  };

  const submitComment = (e) => {
    e.preventDefault();
    if (!commentText || !authorName) return;

    const newComment = {
      projectId: project.id,
      authorName,
      authorType,
      text: commentText,
      images: commentImages
    };

    addComment(newComment);
    setCommentText('');
    setAuthorName('');
    setCommentImages([]);
  };

  const toggleExpandImages = (commentId) => {
      if (expandedCommentId === commentId) {
          setExpandedCommentId(null);
      } else {
          setExpandedCommentId(commentId);
      }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/" className="text-primary hover:underline mb-4 inline-block">&larr; Back to Dashboard</Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-gray-500"><i className="fas fa-map-pin mr-2"></i>{project.location}, {project.region}</p>
          </div>

          {/* Progress Bar (Manual %) */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
             <div className="flex justify-between items-end mb-2">
                <h3 className="font-bold text-lg text-gray-800">Completion Status</h3>
                <span className="text-3xl font-bold text-primary">{project.progress}%</span>
             </div>
             <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full transition-all duration-1000 ${project.status === ProjectStatus.STALLED ? 'bg-red-500' : 'bg-green-500'}`} 
                  style={{ width: `${project.progress}%` }}
                ></div>
             </div>
             <p className="text-xs text-gray-500 mt-2 text-right">Updated by contractor</p>
          </div>

          {/* Image Gallery */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Project Gallery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {galleryImages.map((img, idx) => (
                <div key={idx} className="aspect-video bg-gray-100 rounded-lg overflow-hidden group relative">
                  <img src={img} alt={`Project ${idx}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  {idx === 0 && (
                      <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded shadow">Main Cover</div>
                  )}
                </div>
              ))}
              {galleryImages.length === 0 && <p className="text-gray-400 italic">No images uploaded yet.</p>}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Description</h2>
            <p className="text-gray-700 leading-relaxed">{project.description}</p>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-6">Citizen Reports & Comments</h2>
            
            {/* Add Comment Form */}
            <form onSubmit={submitComment} className="bg-gray-50 p-4 rounded-xl mb-8 border border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Add a Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                 <input 
                    type="text" 
                    placeholder="Your Name" 
                    required 
                    className="border rounded p-2 text-sm"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                 />
                 <select 
                    className="border rounded p-2 text-sm"
                    value={authorType}
                    onChange={(e) => setAuthorType(e.target.value)}
                 >
                    <option value="Citizen">Citizen</option>
                    <option value="NGO">NGO</option>
                 </select>
              </div>
              <textarea 
                placeholder="What did you observe at the site?" 
                required
                className="w-full border rounded p-2 text-sm mb-3 h-24"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              ></textarea>
              
              {/* Image Upload Preview */}
              {commentImages.length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                      {commentImages.map((img, idx) => (
                          <div key={idx} className="relative w-16 h-16 flex-shrink-0">
                              <img src={img} alt="preview" className="w-full h-full object-cover rounded border" />
                              <button 
                                type="button" 
                                onClick={() => removeCommentImage(idx)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                              >
                                  &times;
                              </button>
                          </div>
                      ))}
                  </div>
              )}

              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="relative">
                    <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        onChange={handleImageUpload} 
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10" 
                        disabled={commentImages.length >= 4}
                    />
                    <button type="button" className={`flex items-center gap-2 text-sm ${commentImages.length >= 4 ? 'text-gray-400' : 'text-primary hover:text-sky-700'}`}>
                        <i className="fas fa-camera"></i> {commentImages.length >= 4 ? 'Max photos reached' : 'Attach Photos (Max 4)'}
                    </button>
                 </div>
                 <button type="submit" className="bg-secondary text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-amber-600 transition-colors w-full md:w-auto">
                    Post Comment
                 </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-6">
              {projectComments.length === 0 ? (
                <p className="text-gray-500 italic text-center">No reports yet. Be the first to report!</p>
              ) : (
                projectComments.map(comment => (
                  <div key={comment.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${comment.authorType === 'NGO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                             {comment.authorName ? comment.authorName.charAt(0) : '?'}
                          </div>
                          <div>
                             <span className="font-bold text-gray-800 text-sm block">{comment.authorName}</span>
                             <span className={`text-[10px] uppercase tracking-wider font-bold ${comment.authorType === 'NGO' ? 'text-purple-600' : 'text-blue-500'}`}>
                                {comment.authorType}
                             </span>
                          </div>
                       </div>
                       <span className="text-xs text-gray-400">{comment.date || comment.created_at}</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{comment.text}</p>
                    
                    {/* Comment Images Logic */}
                    {comment.images && comment.images.length > 0 && (
                      <div>
                        {expandedCommentId === comment.id ? (
                            <div className="grid grid-cols-2 gap-2 mt-2 animate-fade-in">
                                {comment.images.map((img, idx) => (
                                    <img key={idx} src={img} alt="Evidence" className="rounded-lg w-full h-32 object-cover border border-gray-200" />
                                ))}
                                <button onClick={() => toggleExpandImages(comment.id)} className="col-span-2 text-xs text-primary underline mt-1">Show less</button>
                            </div>
                        ) : (
                            <div className="relative inline-block mt-2 cursor-pointer group" onClick={() => toggleExpandImages(comment.id)}>
                                <img src={comment.images[0]} alt="Evidence" className="rounded-lg max-h-40 object-cover border border-gray-200" />
                                {comment.images.length > 1 && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg group-hover:bg-black/40 transition-colors">
                                        <span className="text-white font-bold text-lg">+{comment.images.length - 1}</span>
                                    </div>
                                )}
                            </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Financials</h3>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Total Budget</span>
                <p className="text-2xl font-bold text-dark">{formatCurrency(project.budget)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Amount Spent</span>
                <p className={`text-xl font-bold ${project.spent > project.budget ? 'text-red-500' : 'text-primary'}`}>
                  {formatCurrency(project.spent)}
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full" 
                  style={{ width: `${Math.min((project.spent/project.budget)*100, 100)}%`}}
                ></div>
              </div>
              <p className="text-xs text-gray-400">Financial data derived from government reports.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Details</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-gray-500">Contractor</span>
                <span className="font-medium text-right">{project.contractorName}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Start Date</span>
                <span className="font-medium">{project.startDate}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Completion</span>
                <span className="font-medium">{project.completionDate}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
