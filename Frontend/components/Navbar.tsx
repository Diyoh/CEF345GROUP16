import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAppStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className="bg-primary text-white shadow-md sticky top-0 z-50 border-b-4 border-accent">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            {/* Logo Icon using the Yellow Accent */}
            <div className="bg-white p-2 rounded-lg group-hover:bg-accent transition-colors text-primary border-2 border-primary">
              <i className="fas fa-hard-hat text-xl"></i>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-bold tracking-tight text-white">
                BuildRight
              </span>
              <span className="text-xs text-accent font-bold tracking-widest">CAMEROON</span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="hover:text-accent transition-colors font-medium">Projects</Link>
            <Link to="/developers" className="hover:text-accent transition-colors font-medium">Developers</Link>
            
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm bg-white/10 px-3 py-1 rounded-full text-white border border-white/20">
                  <i className="fas fa-user-circle mr-2 text-accent"></i>
                  {user.name}
                </span>
                
                {user.role === UserRole.ADMIN && (
                  <Link to="/admin" className="text-sm hover:text-accent font-medium">Dashboard</Link>
                )}
                {user.role === UserRole.CONTRACTOR && (
                  <Link to="/contractor" className="text-sm hover:text-accent font-medium">Dashboard</Link>
                )}
                {user.role === UserRole.DEVELOPER_ADMIN && (
                  <Link to="/dev-admin" className="text-sm hover:text-accent font-medium">Dashboard</Link>
                )}
                
                <button 
                  onClick={handleLogout}
                  className="text-sm bg-secondary hover:bg-red-700 text-white px-4 py-1.5 rounded-md font-bold shadow-sm transition-colors border border-red-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="bg-accent hover:bg-yellow-400 text-primary px-5 py-2 rounded-md font-bold transition-colors shadow-sm"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-2xl focus:outline-none text-white hover:text-accent"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-white/20 flex flex-col gap-4 pt-4 animate-fade-in">
            <Link to="/" className="hover:text-accent transition-colors font-medium" onClick={() => setIsMobileMenuOpen(false)}>Projects</Link>
            <Link to="/developers" className="hover:text-accent transition-colors font-medium" onClick={() => setIsMobileMenuOpen(false)}>Developers</Link>
            
            {user ? (
              <>
                <div className="text-sm text-gray-200 border-l-2 border-accent pl-3">
                  Signed in as: <span className="text-white font-bold">{user.name}</span>
                </div>
                {user.role === UserRole.ADMIN && (
                  <Link to="/admin" className="hover:text-accent font-medium" onClick={() => setIsMobileMenuOpen(false)}>Admin Dashboard</Link>
                )}
                {user.role === UserRole.CONTRACTOR && (
                  <Link to="/contractor" className="hover:text-accent font-medium" onClick={() => setIsMobileMenuOpen(false)}>Contractor Dashboard</Link>
                )}
                {user.role === UserRole.DEVELOPER_ADMIN && (
                  <Link to="/dev-admin" className="hover:text-accent font-medium" onClick={() => setIsMobileMenuOpen(false)}>Developer Dashboard</Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="bg-secondary hover:bg-red-700 text-white px-4 py-2 rounded text-left w-full font-bold"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className="bg-accent hover:bg-yellow-400 text-primary px-4 py-2 rounded-md font-bold text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};