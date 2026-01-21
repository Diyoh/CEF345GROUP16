import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectStatus } from '../types';

export const ProjectsPage = () => {
    const { projects, teamMembers, loading } = useAppStore();
    
    // Filters State
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [regionFilter, setRegionFilter] = useState('All');
    const [contractorFilter, setContractorFilter] = useState('All');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop
    const [isFilterOpen, setIsFilterOpen] = useState(false); // Mobile

    // Derived Data
    const regions = useMemo(() => {
        const unique = new Set(projects.map(p => p.region).filter(Boolean));
        return ['All', ...Array.from(unique)];
    }, [projects]);

    const contractors = useMemo(() => {
        // Derive unique contractors from the actual projects list
        // This ensures (1) we only show contractors with projects, and (2) it works without protected API calls
        const uniqueParams = new Map();
        projects.forEach(p => {
            // Check for both ID formats just in case
            const id = p.contractorId || p.contractor_id;
            // Only add if we have an ID and Name, and haven't seen this ID before
            if (id && p.contractorName && !uniqueParams.has(id)) {
                uniqueParams.set(id, p.contractorName);
            }
        });
        
        // Convert Map to array of objects { id, name }
        return Array.from(uniqueParams.entries()).map(([id, name]) => ({ id, name }));
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                                  p.location.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
            const matchesRegion = regionFilter === 'All' || p.region === regionFilter;
            const matchesContractor = contractorFilter === 'All' || 
                                     (p.contractorId === contractorFilter || p.contractor_id === contractorFilter);

            return matchesSearch && matchesStatus && matchesRegion && matchesContractor;
        });
    }, [projects, search, statusFilter, regionFilter, contractorFilter]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-dark mb-2">Public Infrastructure Projects</h1>
                    <p className="text-gray-600">Explore ongoing and completed projects across Cameroon.</p>
                </div>
                
                {/* Mobile Filter Toggle */}
                <button 
                    className="md:hidden bg-white border border-gray-300 px-4 py-2 rounded-lg font-bold text-sm w-full"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                    <i className="fas fa-filter mr-2"></i> {isFilterOpen ? 'Hide Filters' : 'Show Filters'}
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Sidebar Filters */}
                {/* Desktop: Sticky & Collapsible */}
                {/* Mobile: Controlled by isFilterOpen */}
                <aside className={`
                    lg:sticky lg:top-24 transition-all duration-300 ease-in-out
                    ${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4'}
                    ${isFilterOpen ? 'block' : 'hidden lg:block'}
                    w-full
                `}>
                    <div className="relative">
                        {/* Desktop Collapse Button */}
                        <button 
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="hidden lg:flex absolute -right-3 top-0 bg-white border border-gray-200 shadow-sm rounded-full w-6 h-6 items-center justify-center text-xs text-gray-500 hover:text-primary z-10"
                            title={isSidebarCollapsed ? "Expand Filters" : "Collapse Filters"}
                        >
                            <i className={`fas fa-chevron-${isSidebarCollapsed ? 'right' : 'left'}`}></i>
                        </button>

                        {isSidebarCollapsed ? (
                            // Collapsed State (Icons only)
                            <div className="flex flex-col gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100 items-center py-6">
                                <button onClick={() => setIsSidebarCollapsed(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Search">
                                    <i className="fas fa-search"></i>
                                </button>
                                <button onClick={() => setIsSidebarCollapsed(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Status">
                                    <i className="fas fa-tasks"></i>
                                </button>
                                <button onClick={() => setIsSidebarCollapsed(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Region">
                                    <i className="fas fa-map-marker-alt"></i>
                                </button>
                                <button onClick={() => setIsSidebarCollapsed(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Contractor">
                                    <i className="fas fa-hard-hat"></i>
                                </button>
                            </div>
                        ) : (
                            // Expanded State (Full Filters)
                            <div className="space-y-6">
                                {/* Search */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Search</label>
                                    <div className="relative">
                                        <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                                        <input
                                            type="text"
                                            placeholder="Project name, city..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 transition-all">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-bold text-gray-700">Project Status</label>
                                        {statusFilter !== 'All' && <button onClick={() => setStatusFilter('All')} className="text-xs text-red-400 hover:text-red-600">Reset</button>}
                                    </div>
                                    <div className="space-y-2">
                                        {['All', ...Object.values(ProjectStatus)].map(status => (
                                            <label key={status} className="flex items-center gap-2 cursor-pointer group">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${statusFilter === status ? 'border-primary' : 'border-gray-300'}`}>
                                                    {statusFilter === status && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                                                </div>
                                                <input 
                                                    type="radio" 
                                                    name="status" 
                                                    className="hidden" 
                                                    checked={statusFilter === status} 
                                                    onChange={() => setStatusFilter(status)} 
                                                />
                                                <span className={`text-sm ${statusFilter === status ? 'text-primary font-bold' : 'text-gray-600 group-hover:text-gray-800'}`}>
                                                    {status}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Region Filter */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Region</label>
                                    <select 
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                        value={regionFilter}
                                        onChange={(e) => setRegionFilter(e.target.value)}
                                    >
                                        {regions.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                {/* Contractor Filter */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Contractor</label>
                                    <select 
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                        value={contractorFilter}
                                        onChange={(e) => setContractorFilter(e.target.value)}
                                    >
                                        <option value="All">All Contractors</option>
                                        {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-[calc(100%-4rem)]' : 'lg:w-3/4'} w-full`}>
                    {/* Results Count */}
                    <div className="mb-4 text-sm text-gray-500 font-medium">
                        Showing {filteredProjects.length} projects
                    </div>

                    {filteredProjects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                            {filteredProjects.map(project => (
                                <ProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl p-12 text-center">
                            <i className="fas fa-search text-4xl text-gray-300 mb-4"></i>
                            <h3 className="text-lg font-bold text-gray-700">No projects found</h3>
                            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search terms.</p>
                            <button 
                                onClick={() => { setSearch(''); setStatusFilter('All'); setRegionFilter('All'); setContractorFilter('All'); }}
                                className="mt-4 text-primary font-bold text-sm hover:underline"
                            >
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
