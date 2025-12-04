import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-primary text-white py-12 mt-auto border-t-8 border-accent relative">
      <div className="container mx-auto px-4 text-center">
        <div className="flex justify-center items-center gap-2 mb-6">
          <div className="bg-white p-2 rounded-full shadow-lg">
            <i className="fas fa-building text-2xl text-primary"></i>
          </div>
          <span className="text-2xl font-extrabold text-white tracking-wide">
            BuildRight<span className="text-accent">.cm</span>
          </span>
        </div>
        
        <p className="mb-8 text-sm text-green-50 max-w-lg mx-auto leading-relaxed">
          Promoting transparency, accountability, and citizen engagement in public infrastructure across Cameroon.
        </p>
        
        <div className="flex flex-wrap justify-center gap-8 mb-10 text-sm font-bold tracking-wide">
          <Link to="/" className="hover:text-accent transition-colors">PROJECTS</Link>
          <Link to="/developers" className="hover:text-accent transition-colors">OUR TEAM</Link>
          <Link to="/login" className="hover:text-accent transition-colors">PORTAL LOGIN</Link>
          <a href="#" className="hover:text-accent transition-colors">PRIVACY</a>
        </div>
        
        <div className="border-t border-white/20 pt-8 text-xs text-green-100 flex flex-col items-center gap-2">
          <div className="flex gap-4 mb-2">
             <i className="fab fa-facebook hover:text-accent cursor-pointer text-lg"></i>
             <i className="fab fa-twitter hover:text-accent cursor-pointer text-lg"></i>
             <i className="fab fa-linkedin hover:text-accent cursor-pointer text-lg"></i>
          </div>
          <p>&copy; 2025 BuildRight Group 16. All rights reserved.</p> 
          <p className="font-medium">Building the Future of <span className="text-accent">Cameroon</span>.</p>
        </div>
      </div>
    </footer>
  );
};