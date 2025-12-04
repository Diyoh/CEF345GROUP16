export enum UserRole {
  PUBLIC = 'PUBLIC',
  ADMIN = 'ADMIN',
  CONTRACTOR = 'CONTRACTOR',
  DEVELOPER_ADMIN = 'DEVELOPER_ADMIN'
}

export enum ProjectStatus {
  PLANNED = 'Planned',
  ONGOING = 'Ongoing',
  STALLED = 'Stalled',
  COMPLETED = 'Completed'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

export interface Comment {
  id: string;
  projectId: string;
  authorName: string;
  authorType: 'Citizen' | 'NGO';
  text: string;
  date: string;
  images?: string[]; // URLs or Base64
}

export interface AccessCode {
  code: string;
  role: UserRole;
  isUsed: boolean;
  generatedBy: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  location: string;
  region: string;
  budget: number;
  spent: number;
  progress: number; // 0 to 100 percentage
  status: ProjectStatus;
  contractorId: string;
  contractorName: string;
  startDate: string;
  completionDate: string;
  images: string[]; // URLs or Base64
  updates: ProjectUpdate[];
}

export interface ProjectUpdate {
  id: string;
  date: string;
  message: string;
  author: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
}