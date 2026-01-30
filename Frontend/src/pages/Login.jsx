import React, { useState } from 'react';
import { useAppStore } from '../useAppStore';
import { UserRole } from '../types';
import { Navigate } from 'react-router-dom';

export const Login = () => {
  const { login, register, user, loading, error } = useAppStore();
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('admin@buildright.cm');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // [NEW] Toggle state

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');

  if (user) {
    if (user.role === UserRole.ADMIN) return <Navigate to="/admin" />;
    if (user.role === UserRole.CONTRACTOR) return <Navigate to="/contractor" />;
    if (user.role === UserRole.DEVELOPER_ADMIN) return <Navigate to="/dev-admin" />;
    return <Navigate to="/" />;
  }

  const handleLogin = async (e) => {
    // ... (unchanged)
    e.preventDefault();
    /* 
       Demo Auto-fill Logic:
       If password field is empty, we inject the demo password for known emails.
       In a real app, users would type the password. 
    */
    let password = loginPassword;
    if (!password) {
        if (loginEmail === 'admin@buildright.cm') password = 'password'; 
        else if (loginEmail === 'contact@btpcameroun.cm') password = 'password';
        else if (loginEmail === 'dev@buildright.cm') password = 'password';
        else {
             alert("Please enter a password.");
             return;
        }
    }
    
    await login(loginEmail, password);
  };

  const handleRegister = async (e) => {
      e.preventDefault();
      setRegError('');

      if (regPassword !== regConfirmPassword) {
          setRegError('Passwords do not match');
          return;
      }

      if (regPassword.length < 6) {
          setRegError('Password must be at least 6 characters');
          return;
      }

      const success = await register(regName, regEmail, regCode, regPassword);
      if (!success) {
          setRegError('Registration failed. Check your code or email.');
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
        
        {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm text-center">
                {error}
            </div>
        )}

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
                  type="password" 
                  placeholder="Create Password" 
                  required 
                  className="w-full border p-3 rounded-lg"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
                <input 
                  type="password" 
                  placeholder="Confirm Password" 
                  required 
                  className="w-full border p-3 rounded-lg"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
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
                <button type="submit" disabled={loading} className="w-full bg-secondary hover:bg-amber-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
                    {loading ? 'Creating...' : 'Create Account'}
                </button>
                <div className="text-center mt-4">
                    <button type="button" onClick={() => setIsRegistering(false)} className="text-primary text-sm hover:underline">Back to Login</button>
                </div>
            </form>
        ) : (
            <form onSubmit={handleLogin} className="space-y-4">
                <div className="text-sm text-gray-500 mb-2 bg-blue-50 p-2 rounded">
                    <p className="font-bold">Demo Credentials (Password: "password"):</p>
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
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Password" 
                        className="w-full border p-3 rounded-lg pr-10" 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-sky-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
                    {loading ? 'Signing In...' : 'Sign In'}
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
