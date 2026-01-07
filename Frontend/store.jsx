/**
 * FRONTEND STORE (CONTEXT)
 * 
 * This file implements Global State Management using React's Context API.
 * 
 * WHY USE THIS?
 * Instead of passing data (props) down through many layers of components ("prop drilling"), 
 * any component in the app can access 'user', 'projects', 'loading', etc., directly from this store.
 * 
 * HOW IT WORKS:
 * 1. The `AppProvider` wraps the entire application (in App.jsx).
 * 2. It initializes state (user, projects, etc.).
 * 3. `useEffect` runs once on load to fetch data from the Backend via `api.js`.
 * 4. It exports functions (login, addProject) that components call to change state.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
    
    // --- GLOBAL STATE VARIABLES ---
    const [user, setUser] = useState(null); // Holds current logged-in user info
    const [authChecked, setAuthChecked] = useState(false); // Prevents UI flickering while checking login status

    const [projects, setProjects] = useState([]);      // List of all projects
    const [teamMembers, setTeamMembers] = useState([]); // List of contractors/admins
    const [comments, setComments] = useState([]);       // Comments for the current view
    const [accessCodes, setAccessCodes] = useState([]); // Verification codes for registration
    
    const [loading, setLoading] = useState(false); // Global loading spinner
    const [error, setError] = useState(null);      // Global error message

    // --- INITIAL DATA FETCHING ---
    // This effect runs ONLY once when the application starts/reloads.
    useEffect(() => {
        const initApp = async () => {
            setLoading(true);
            try {
                // 1. CHECK AUTH: Call backend to see if we have a valid HTTP cookie.
                const meRes = await api.getMe();
                let currentUser = null;
                
                if (meRes.success) {
                    currentUser = meRes.data;
                    setUser(currentUser); // Log user in on frontend
                }

                // 2. FETCH PUBLIC DATA: Projects and Team are visible to everyone.
                // We use Promise.all to fetch them in parallel for speed.
                const [projectsRes, teamRes] = await Promise.all([
                    api.getProjects({ limit: 100 }),
                    api.getTeam()
                ]);

                if (projectsRes.success) setProjects(projectsRes.data);
                if (teamRes.success) setTeamMembers(teamRes.data);

                // 3. FETCH PROTECTED DATA: Only if user is ADMIN.
                if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER_ADMIN')) {
                     const codesRes = await api.getAccessCodes();
                     if (codesRes.success) setAccessCodes(codesRes.data);
                }

            } catch (err) {
                console.error("Init failed", err);
            } finally {
                setLoading(false);
                setAuthChecked(true); // Mark initialization as complete
            }
        };

        initApp();
    }, []); 

    // --- ACTIONS ---

    const login = async (email, password = 'password') => {
        setLoading(true);
        try {
            const res = await api.login(email, password);
            if (res.success) {
                setUser(res.data); // Backend set the cookie, we just set state
                return true;
            } else {
                setError(res.error);
                return false;
            }
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await api.logout(); // Clears cookie on server
            setUser(null);
            setProjects([]); 
            window.location.reload();
        } catch (e) {
            console.error(e);
        }
    };

    const register = async (name, email, code) => {
        setLoading(true);
        try {
            const res = await api.register(name, email, 'password123', code);
            if (res.success) {
                setUser(res.data);
                return true;
            } else {
                setError(res.error);
                return false;
            }
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateProject = async (updatedProject) => {
        try {
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
            await api.updateProject(updatedProject.id, updatedProject);
        } catch (err) { console.error("Update failed", err); }
    };

    const addProject = async (newProject) => {
        try {
            setProjects(prev => [newProject, ...prev]);
            const res = await api.createProject(newProject);
            if (res.success) {
                setProjects(prev => prev.map(p => p === newProject ? res.data : p));
            }
        } catch (err) { console.error("Create failed", err); }
    };

    const deleteProject = async (id) => {
        try {
            setProjects(prev => prev.filter(p => p.id !== id));
            await api.deleteProject(id);
        } catch (err) {console.error(err);}
    };

    const updateTeamMember = async (updatedMember) => {
        try {
            setTeamMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
            await api.updateTeamMember(updatedMember.id, updatedMember);
        } catch (err) {console.error(err);}
    };

    const addComment = async (newComment) => {
        try {
            setComments(prev => [newComment, ...prev]);
            await api.createComment(newComment.projectId, newComment);
        } catch (err) {console.error(err);}
    };

    const deleteComment = async (id) => {
        try {
            setComments(prev => prev.filter(c => c.id !== id));
            await api.deleteComment(id);
        } catch (err) {console.error(err);}
    };

    const generateAccessCode = async (role) => {
        try {
            const res = await api.generateAccessCode(role);
            if(res.success) {
                setAccessCodes(prev => [...prev, { ...res.data, isUsed: false, generatedBy: user.name }]);
            }
        } catch (err) {console.error(err);}
    };

    const fetchProjectComments = async (projectId) => {
        const res = await api.getComments(projectId);
        if (res.success) {
            setComments(prev => {
                const others = prev.filter(c => c.projectId !== projectId);
                return [...others, ...res.data];
            });
        }
    };

    return (
        <AppContext.Provider value={{
            user, projects, teamMembers, comments, accessCodes,
            loading, error, authChecked,
            login, logout, register,
            updateProject, updateTeamMember, addProject, deleteProject,
            addComment, deleteComment, generateAccessCode, fetchProjectComments
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppStore = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppStore must be used within AppProvider");
    return context;
};
