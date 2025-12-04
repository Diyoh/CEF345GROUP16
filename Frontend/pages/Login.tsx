import React, { useState } from 'react';
import { useAppStore } from '../store';
import { UserRole } from '../types';
import { Navigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const { login, register, user } = useAppStore();
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('admin@buildright.cm'); // Default for demo

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regError, setRegError] = useState('');

  if (user) {
    if (user.role === UserRole.ADMIN) return <Navigate to="/admin" />;
    if (user.role === UserRole.CONTRACTOR) return <Navigate to="/contractor" />;
    if (user.role === UserRole.DEVELOPER_ADMIN) return <Navigate to="/dev-admin" />;
    return <Navigate to="/" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simplified login: Finding user by email for this demo
    // In real app, we'd use ID and password auth
    // MOCK_USERS in data.ts have IDs u1, u2, u3, u4.
    // Mapping emails to IDs roughly for the demo:
    let id = '';
    if (loginEmail.includes('admin')) id = 'u1';
    else if (loginEmail.includes('btp')) id = 'u2';
    else if (loginEmail.includes('fast')) id = 'u3';
    else if (loginEmail.includes('dev')) id = 'u4';
    
    // Fallback to searching the store's users array (for newly registered users)
    if (!id) {
       // logic to find user by email would be here in real app
       alert("For this demo, please use one of the pre-defined emails or a newly registered one.");
       return; 
    }
    
    login(id);
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setRegError('');
      const success = await register(regName, regEmail, regCode);
      if (!success) {
          setRegError('Invalid or used access code.');
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <i className="fas fa-hard-hat text-4xl text-secondary mb-2"></i>
          <h1 className="text-2xl font-bold text-dark">{isRegistering ? 'Create Account' : 'Portal Login'}</h1>
          <p className="text-gray-500 text-sm">{isRegistering ? 'Enter your invite code' : 'Access your dashboard'}</p>
        </div>
        
        {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
                <input 
                    type="text" 
                    placeholder="Full Name" 
                    required 
                    className="w-full border p-3 rounded-lg"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                />
                <input 
                    type="email" 
                    placeholder="Email Address" 
                    required 
                    className="w-full border p-3 rounded-lg"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                />
                <input 
                    type="text" 
                    placeholder="Access Code (Provided by Developers)" 
                    required 
                    className="w-full border p-3 rounded-lg bg-gray-50"
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value)}
                />
                {regError && <p className="text-red-500 text-sm">{regError}</p>}
                <button type="submit" className="w-full bg-secondary hover:bg-amber-600 text-white font-bold py-3 rounded-lg transition-colors">
                    Create Account
                </button>
                <div className="text-center mt-4">
                    <button type="button" onClick={() => setIsRegistering(false)} className="text-primary text-sm hover:underline">Back to Login</button>
                </div>
            </form>
        ) : (
            <form onSubmit={handleLogin} className="space-y-4">
                <div className="text-sm text-gray-500 mb-2 bg-blue-50 p-2 rounded">
                    <p className="font-bold">Demo Credentials:</p>
                    <p>Admin: admin@buildright.cm</p>
                    <p>Contractor: contact@btpcameroun.cm</p>
                    <p>Dev: dev@buildright.cm</p>
                </div>
                <input 
                    type="email" 
                    placeholder="Email" 
                    className="w-full border p-3 rounded-lg" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                />
                <input type="password" placeholder="Password" className="w-full border p-3 rounded-lg" defaultValue="password" />
                <button type="submit" className="w-full bg-primary hover:bg-sky-600 text-white font-bold py-3 rounded-lg transition-colors">
                    Sign In
                </button>
                <div className="text-center mt-4">
                    <button type="button" onClick={() => setIsRegistering(true)} className="text-primary text-sm hover:underline">I have an access code</button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};