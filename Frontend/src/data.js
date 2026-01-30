import { ProjectStatus, UserRole } from './types';

// Mock Users
export const MOCK_USERS = [
  { id: 'u1', name: 'Admin User', role: UserRole.ADMIN, email: 'admin@buildright.cm' },
  { id: 'u2', name: 'BTP Cameroun S.A.', role: UserRole.CONTRACTOR, email: 'contact@btpcameroun.cm' },
  { id: 'u3', name: 'BuildFast Const', role: UserRole.CONTRACTOR, email: 'info@buildfast.cm' },
  { id: 'u4', name: 'Dev Team Lead', role: UserRole.DEVELOPER_ADMIN, email: 'dev@buildright.cm' },
];

// Mock Projects
export const MOCK_PROJECTS = [
  {
    id: 'p1',
    title: 'Yaoundé-Douala Highway Phase 2',
    description: 'Construction of the remaining 60km section connecting the two major economic hubs.',
    location: 'Edéa',
    region: 'Littoral',
    budget: 85000000000,
    spent: 45000000000,
    progress: 55,
    status: ProjectStatus.ONGOING,
    contractorId: 'u2',
    contractorName: 'BTP Cameroun S.A.',
    startDate: '2023-01-15',
    completionDate: '2026-06-30',
    images: [
      '/pictures/upbeat-gen-z-girl-reading-messages-phone.jpg',
      '/pictures/beautiful-smiling-african-american-woman-using-phone-outdoors.jpg'
    ],
    updates: [
      { id: 'up1', date: '2023-11-20', message: 'Foundation work completed for bridge section.', author: 'Site Manager' }
    ]
  },
  {
    id: 'p2',
    title: 'Regional Hospital Maroua',
    description: 'Modernization of the regional hospital including new pediatric wing.',
    location: 'Maroua',
    region: 'Far North',
    budget: 12000000000,
    spent: 11500000000,
    progress: 100,
    status: ProjectStatus.COMPLETED,
    contractorId: 'u3',
    contractorName: 'BuildFast Const',
    startDate: '2022-03-10',
    completionDate: '2024-01-20',
    images: [
      '/pictures/upbeat-gen-z-girl-reading-messages-phone.jpg',
      '/pictures/beautiful-smiling-african-american-woman-using-phone-outdoors.jpg'
    ],
    updates: []
  },
  {
    id: 'p3',
    title: 'Rural Electrification - East Region',
    description: 'Installation of solar grids in 50 villages.',
    location: 'Bertoua',
    region: 'East',
    budget: 5000000000,
    spent: 1000000000,
    progress: 20,
    status: ProjectStatus.STALLED,
    contractorId: 'u2',
    contractorName: 'BTP Cameroun S.A.',
    startDate: '2024-01-01',
    completionDate: '2025-12-31',
    images: [
      '/pictures/upbeat-gen-z-girl-reading-messages-phone.jpg'
    ],
    updates: [
      { id: 'up2', date: '2024-02-15', message: 'Equipment delivery delayed due to customs.', author: 'Logistics Officer' }
    ]
  },
  {
    id: 'p4',
    title: 'New Community Library',
    description: 'A modern library facility for the university district.',
    location: 'Buea',
    region: 'South West',
    budget: 250000000,
    spent: 0,
    progress: 0,
    status: ProjectStatus.PLANNED,
    contractorId: 'u3',
    contractorName: 'BuildFast Const',
    startDate: '2025-06-01',
    completionDate: '2026-01-01',
    images: ["/pictures/Bullseye PNG.jpg"],
    updates: []
  }
];

// Mock Team
export const MOCK_TEAM = [
  {
    id: 't1',
    name: 'Diyoh shiloh',
    role: 'Lead Engineer',
    bio: 'SOFTWARE engineer with 15 years experience in public works monitoring.',
    imageUrl: '/pictures/Doc 2.png'
  },
  {
    id: 't2',
    name: 'ASOBO JOYCE',
    role: 'Data Scientist',
    bio: 'Specialist in detecting financial anomalies in public datasets.',
    imageUrl: '/pictures/Doc 2.png'
  },
  {
    id: 't3',
    name: 'SHOTS FO REAL',
    role: 'Development Team',
    bio: 'The brilliant minds behind the BuildRight platform.',
    imageUrl: '/pictures/Doc 2.png'
  },
  {
    id: 't4',
    name: 'soh marrious',
    role: 'Development Team',
    bio: 'The brilliant minds behind the BuildRight platform.',
    imageUrl: '/pictures/Doc 2.png'
  },
  {
    id: 't5',
    name: 'Gboyz',
    role: 'Development Team',
    bio: 'The brilliant minds behind the BuildRight platform.',
    imageUrl: '/pictures/Doc 2.png'
  }
];

// Mock Comments
export const MOCK_COMMENTS = [
  {
    id: 'c1',
    projectId: 'p1',
    authorName: 'Jean K.',
    authorType: 'Citizen',
    text: 'Work seems to be moving fast near the river.',
    date: '2024-02-10',
    images: ['/pictures/upbeat-gen-z-girl-reading-messages-phone.jpg',
      '/pictures/beautiful-smiling-african-american-woman-using-phone-outdoors.jpg']
  },
  {
    id: 'c2',
    projectId: 'p1',
    authorName: 'EcoWatch Cameroon',
    authorType: 'NGO',
    text: 'We are concerned about the drainage system planning.',
    date: '2024-02-12'
  }
];

// Mock Access Codes
export const MOCK_ACCESS_CODES = [
  { code: 'DEV123', role: UserRole.DEVELOPER_ADMIN, isUsed: false, generatedBy: 'system' },
  { code: 'ADMIN123', role: UserRole.ADMIN, isUsed: false, generatedBy: 'system' },
  { code: 'CONTR123', role: UserRole.CONTRACTOR, isUsed: false, generatedBy: 'system' },
];
