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
import { api, SOCKET_URL } from './api';

export const AppContext = createContext(undefined);

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

    // --- SOCKET.IO REAL-TIME UPDATES ---
    useEffect(() => {
        let socket;

        // Import dynamically to avoid SSR issues if we were using Next.js (good practice)
        import('socket.io-client').then(({ io }) => {
            // Derived from the same env var as the REST API, so real-time keeps
            // working in deployed builds instead of pointing at the developer's machine.
            socket = io(SOCKET_URL, {
                withCredentials: true,
            });

            socket.on('connect', () => {
                console.log('Connected to real-time updates');
            });

            // Handle Project Created
            socket.on('project:created', (newProject) => {
                setProjects(prev => {
                    if (prev.some(p => p.id === newProject.id)) return prev;
                    return [newProject, ...prev];
                });
            });

            // Handle Project Updated
            socket.on('project:updated', (updatedData) => {
                setProjects(prev => prev.map(p => 
                    p.id === updatedData.id ? { ...p, ...updatedData } : p
                ));
            });

            // Handle Project Deleted
            socket.on('project:deleted', ({ id }) => {
                setProjects(prev => prev.filter(p => p.id !== id));
            });
        });

        // Cleanup on unmount
        return () => {
             if (socket) {
                 socket.disconnect();
                 console.log('Disconnected from real-time updates');
             }
        };
    }, []);

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
                const currentUser = res.data;
                setUser(currentUser); 
                
                // [FIX] Fetch protected data immediately after login
                if (currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER_ADMIN') {
                     const codesRes = await api.getAccessCodes();
                     if (codesRes.success) setAccessCodes(codesRes.data);
                }

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
            // window.location.reload(); // Removed to prevent 401 error on reload
        } catch (e) {
            console.error(e);
        }
    };

    const changePassword = async (currentPassword, newPassword) => {
        setLoading(true);
        try {
            const res = await api.changePassword(currentPassword, newPassword);
            return res; // { success: true/false, message/error }
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const register = async (name, email, code, password) => {
        setLoading(true);
        try {
            const res = await api.register(name, email, password, code);
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

    const updateProject = async (optimisticProject, apiData = null) => {
        // Keep the pre-update row so a rejected request can be rolled back. Without this
        // the UI kept showing values the server refused to store — the most damaging
        // failure mode in a product whose only job is to display trustworthy figures.
        const previous = projects.find(p => p.id === optimisticProject.id);

        try {
            setProjects(prev => prev.map(p => p.id === optimisticProject.id ? optimisticProject : p));
            // Use apiData (FormData) if provided, otherwise JSON object
            const res = await api.updateProject(optimisticProject.id, apiData || optimisticProject);

            if (res.success) {
                // Replace the optimistic guess with what the server actually stored.
                if (res.data) {
                    setProjects(prev => prev.map(p => p.id === res.data.id ? { ...p, ...res.data } : p));
                }
                return { success: true };
            }

            if (previous) setProjects(prev => prev.map(p => p.id === previous.id ? previous : p));
            return { success: false, error: res.error };

        } catch (err) {
            console.error("Update failed", err);
            if (previous) setProjects(prev => prev.map(p => p.id === previous.id ? previous : p));
            return { success: false, error: err.message };
        }
    };

    const addProject = async (optimisticProject, apiData = null) => {
        try {
            // Optimistic update
            const tempId = optimisticProject.id || `temp-${Date.now()}`;
            const projectWithTempId = { ...optimisticProject, id: tempId };
            
            setProjects(prev => [projectWithTempId, ...prev]);

            // Use apiData (FormData) if provided, otherwise JSON object
            const res = await api.createProject(apiData || optimisticProject);
            
            if (res.success) {
                const realProject = res.data;
                
                // [FIX] Check if socket already added it to avoid duplicates
                setProjects(prev => {
                    // if real project is already there (from socket), just remove the temp one
                    if (prev.some(p => p.id === realProject.id)) {
                        return prev.filter(p => p.id !== tempId);
                    }
                    // otherwise, replace temp with real
                    return prev.map(p => p.id === tempId ? realProject : p);
                });
                
                return { success: true };
            } else {
                // Remove optimistic if failed
                setProjects(prev => prev.filter(p => p.id !== tempId));
                setError(res.error);
                return { success: false, error: res.error };
            }
        } catch (err) { 
            console.error("Create failed", err);
            return { success: false, error: err.message };
        }
    };

    /**
     * addProjectUpdate
     * Appends a dated note to a project's public timeline (project_updates).
     *
     * This is the audit trail — the record of how a project reached its current numbers,
     * which is the part a citizen or auditor can actually argue with. The endpoint and the
     * table existed from the start; nothing ever called them, so the history rendered on
     * every project page was only ever seed data.
     */
    const addProjectUpdate = async (projectId, message, date) => {
        try {
            const res = await api.addGlobalUpdate(projectId, { message, date });

            if (res.success) {
                // The server returns the full project including its updates, so the
                // timeline is correct without a refetch.
                if (res.data) {
                    setProjects(prev => prev.map(p => p.id === res.data.id ? { ...p, ...res.data } : p));
                }
                return { success: true };
            }
            return { success: false, error: res.error };

        } catch (err) {
            console.error('Timeline update failed', err);
            return { success: false, error: err.message };
        }
    };

    const deleteProject = async (id) => {
        // Restore the row if the server refuses. Previously the project vanished from the
        // UI and survived in the database, so it reappeared on the next reload.
        const previous = projects.find(p => p.id === id);
        const index = projects.findIndex(p => p.id === id);

        try {
            setProjects(prev => prev.filter(p => p.id !== id));
            const res = await api.deleteProject(id);

            if (!res?.success) {
                if (previous) setProjects(prev => {
                    const next = [...prev];
                    next.splice(Math.max(index, 0), 0, previous);
                    return next;
                });
                return { success: false, error: res?.error || 'Delete failed' };
            }
            return { success: true };

        } catch (err) {
            console.error(err);
            if (previous) setProjects(prev => {
                const next = [...prev];
                next.splice(Math.max(index, 0), 0, previous);
                return next;
            });
            return { success: false, error: err.message };
        }
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

    const [contractors, setContractors] = useState([]); // List of registered contractors

    // ... (existing code)

    const fetchContractors = async () => {
        try {
            const res = await api.getContractors();
            if (res.success) setContractors(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchContractorStats = async (id) => {
        try {
            const res = await api.getContractorStats(id);
            if (res.success) return res.data;
            return null;
        } catch (err) { 
            console.error(err); 
            return null;
        }
    };

    return (
        <AppContext.Provider value={{
            user, projects, teamMembers, comments, accessCodes, contractors,
            loading, error, authChecked,
            login, logout, register, changePassword,
            updateProject, updateTeamMember, addProject, deleteProject, addProjectUpdate,
            addComment, deleteComment, generateAccessCode, fetchProjectComments,
            fetchContractors, fetchContractorStats
        }}>
            {children}
        </AppContext.Provider>
    );
};


