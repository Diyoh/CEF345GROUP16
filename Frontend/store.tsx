import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, User, TeamMember, UserRole, Comment, AccessCode } from './types';
import { MOCK_PROJECTS, MOCK_USERS, MOCK_TEAM, MOCK_COMMENTS, MOCK_ACCESS_CODES } from './data';

interface AppState {
  user: User | null;
  projects: Project[];
  teamMembers: TeamMember[];
  comments: Comment[];
  accessCodes: AccessCode[];
  login: (userId: string) => void;
  logout: () => void;
  register: (name: string, email: string, code: string) => Promise<boolean>;
  updateProject: (project: Project) => void;
  updateTeamMember: (member: TeamMember) => void;
  addProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  addComment: (comment: Comment) => void;
  deleteComment: (id: string) => void;
  generateAccessCode: (role: UserRole) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'buildright_user',
  PROJECTS: 'buildright_projects',
  COMMENTS: 'buildright_comments',
  TEAM: 'buildright_team',
  ACCESS_CODES: 'buildright_access_codes',
  USERS: 'buildright_users'
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from LocalStorage or Fallback to Mock Data
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    return stored ? JSON.parse(stored) : null;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return stored ? JSON.parse(stored) : MOCK_PROJECTS;
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.TEAM);
    return stored ? JSON.parse(stored) : MOCK_TEAM;
  });

  const [comments, setComments] = useState<Comment[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    return stored ? JSON.parse(stored) : MOCK_COMMENTS;
  });

  const [accessCodes, setAccessCodes] = useState<AccessCode[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.ACCESS_CODES);
    return stored ? JSON.parse(stored) : MOCK_ACCESS_CODES;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    return stored ? JSON.parse(stored) : MOCK_USERS;
  });

  // Effects to persist data whenever it changes
  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.USER);
  }, [user]);

  useEffect(() => localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects)), [projects]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(teamMembers)), [teamMembers]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments)), [comments]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.ACCESS_CODES, JSON.stringify(accessCodes)), [accessCodes]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)), [users]);

  const login = (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    if (foundUser) setUser(foundUser);
  };

  const logout = () => {
    setUser(null);
  };

  const register = async (name: string, email: string, code: string): Promise<boolean> => {
    const accessCode = accessCodes.find(ac => ac.code === code && !ac.isUsed);
    
    if (!accessCode) {
        return false;
    }

    setAccessCodes(prev => prev.map(ac => ac.code === code ? { ...ac, isUsed: true } : ac));

    const newUser: User = {
        id: `u${Date.now()}`,
        name,
        email,
        role: accessCode.role
    };

    setUsers(prev => [...prev, newUser]);
    setUser(newUser);
    return true;
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const addProject = (newProject: Project) => {
    setProjects(prev => [...prev, newProject]);
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const updateTeamMember = (updatedMember: TeamMember) => {
    setTeamMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
  };

  const addComment = (newComment: Comment) => {
    setComments(prev => [newComment, ...prev]);
  };

  const deleteComment = (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const generateAccessCode = (role: UserRole) => {
    const newCode: AccessCode = {
        code: `${role.substring(0, 3)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        role: role,
        isUsed: false,
        generatedBy: user?.name || 'Unknown'
    };
    setAccessCodes(prev => [...prev, newCode]);
  };

  return (
    <AppContext.Provider value={{
      user,
      projects,
      teamMembers,
      comments,
      accessCodes,
      login,
      logout,
      register,
      updateProject,
      updateTeamMember,
      addProject,
      deleteProject,
      addComment,
      deleteComment,
      generateAccessCode
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