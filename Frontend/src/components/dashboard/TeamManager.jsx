import React from 'react';

export const TeamManager = ({
    members,
    editingMember,
    onEditClick,
    onCancelEdit,
    onSave
}) => {
    return (
        <div>
            <h2 className="text-xl font-bold mb-6 text-gray-800">Team Management</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map(m => (
                    <div key={m.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden">
                        {/* Visual decoration */}
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>

                        {editingMember?.id === m.id ? (
                            <form onSubmit={onSave} className="space-y-3 animate-fade-in relative z-10">
                                <input type="hidden" name="id" value={m.id} />
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
                                    <input name="name" defaultValue={m.name} className="w-full border border-gray-300 p-2 rounded focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Role</label>
                                    <input name="role" defaultValue={m.role} className="w-full border border-gray-300 p-2 rounded focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Bio</label>
                                    <textarea name="bio" defaultValue={m.bio} className="w-full border border-gray-300 p-2 rounded focus:ring-1 focus:ring-primary focus:outline-none text-sm h-20" />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm transition-colors flex-1">Save</button>
                                    <button type="button" onClick={onCancelEdit} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-4">
                                    <img src={m.imageUrl} className="w-12 h-12 rounded-full border-2 border-gray-100 shadow-sm object-cover" alt={m.name} />
                                    <div>
                                        <h3 className="font-bold text-gray-900">{m.name}</h3>
                                        <p className="text-xs text-primary font-bold uppercase tracking-wider">{m.role}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-6 min-h-[40px]">{m.bio}</p>
                                <button
                                    onClick={() => onEditClick(m)}
                                    className="text-gray-500 hover:text-secondary text-xs font-bold flex items-center gap-1 transition-colors"
                                >
                                    <i className="fas fa-pencil-alt"></i> Edit Information
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
