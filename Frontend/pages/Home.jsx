import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { ProjectCard } from '../components/ProjectCard';
import { formatCurrency } from '../utils/helpers';
import { ProjectStatus } from '../types';

export const Home = () => {
    const { projects } = useAppStore();
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('recent');

    const filteredProjects = useMemo(() => {
        return projects
            .filter(p => {
                const matchesStatus = filter === 'All' || p.status === filter;
                const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
                    p.location.toLowerCase().includes(search.toLowerCase());
                return matchesStatus && matchesSearch;
            })
            .sort((a, b) => {
                if (sort === 'budget') return b.budget - a.budget;
                return b.id.localeCompare(a.id);
            });
    }, [projects, filter, search, sort]);

    // Upcoming projects (Planned)
    const upcomingProjects = projects.filter(p => p.status === ProjectStatus.PLANNED);

    // Stats for Hero
    const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
    const totalProjects = projects.length;

    return (
        <div className="min-h-screen pb-12 bg-gray-50">
            {/* Hero Section - Cameroon Green Background */}
            <section className="bg-primary text-white py-20 px-4 relative overflow-hidden">
                {/* Background decorative circle - Yellow */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-accent opacity-20 rounded-full blur-3xl"></div>
                {/* Background decorative circle - Red */}
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-secondary opacity-30 rounded-full blur-3xl"></div>

                <div className="container mx-auto max-w-5xl text-center relative z-10">
                    <div className="mb-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                        <i className="fas fa-star text-accent"></i>
                        <span className="font-bold text-sm tracking-wide">REPUBLIQUE DU CAMEROUN</span>
                        <i className="fas fa-star text-accent"></i>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                        Building Cameroon <br /><span className="text-accent">Transparently</span> Together
                    </h1>
                    <p className="text-lg md:text-xl text-gray-100 mb-10 max-w-2xl mx-auto font-light">
                        A public platform tracking <span className="font-bold text-white border-b-2 border-secondary">{totalProjects} projects</span> across the nation.
                        Monitoring <span className="font-bold text-accent">{formatCurrency(totalBudget)}</span> in public infrastructure funds.
                    </p>

                    <div className="flex flex-col md:flex-row justify-center gap-4 max-w-3xl mx-auto">
                        <div className="relative w-full">
                            <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="text"
                                placeholder="Search projects by name, city, or region..."
                                className="w-full pl-12 pr-6 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-accent/50 shadow-xl"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <button className="bg-secondary hover:bg-red-700 text-white px-8 py-4 rounded-lg font-bold transition-colors shadow-xl flex items-center justify-center gap-2 whitespace-nowrap border-b-4 border-red-800 active:border-b-0 active:translate-y-1">
                            Find Projects
                        </button>
                    </div>
                </div>
            </section>

            {/* Dashboard & Grid */}
            <div className="container mx-auto px-4 -mt-16 relative z-20">
                <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 mb-12 border-t-8 border-accent">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <span className="bg-primary/10 text-primary p-2 rounded-lg"><i className="fas fa-chart-pie"></i></span>
                            Projects Dashboard
                        </h2>

                        <div className="flex flex-wrap gap-4 w-full md:w-auto">
                            <select
                                className="flex-1 md:flex-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none cursor-pointer hover:bg-white transition-colors"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            >
                                <option value="All">All Statuses</option>
                                {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                                className="flex-1 md:flex-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none cursor-pointer hover:bg-white transition-colors"
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                            >
                                <option value="recent">Most Recent</option>
                                <option value="budget">Highest Budget</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredProjects.map(p => (
                            <ProjectCard key={p.id} project={p} />
                        ))}
                    </div>

                    {filteredProjects.length === 0 && (
                        <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <i className="fas fa-search-location text-5xl text-gray-300 mb-4"></i>
                            <p className="text-lg font-medium">No projects found.</p>
                            <p className="text-sm">Try adjusting your search or filters.</p>
                        </div>
                    )}
                </div>

                {/* Upcoming Projects Section */}
                {upcomingProjects.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6 pl-3 border-l-4 border-secondary">
                            <h2 className="text-2xl font-bold text-dark">Upcoming Projects</h2>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">Planned</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {upcomingProjects.map(p => (
                                <ProjectCard key={p.id} project={p} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
