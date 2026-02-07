import React from 'react';

export const StatusModal = ({ isOpen, onClose, type = 'success', message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full text-center animate-fade-in-up">
                <div className={`text-5xl mb-4 ${type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                    <i className={`fas ${type === 'success' ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">
                    {type === 'success' ? 'Success!' : 'Error'}
                </h3>
                <p className="text-gray-600 mb-6 font-medium">
                    {message}
                </p>
                <button 
                    onClick={onClose} 
                    className={`px-6 py-2 rounded-lg font-bold text-white shadow-md transition-transform active:scale-95 ${
                        type === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                    }`}
                >
                    Close
                </button>
            </div>
        </div>
    );
};
