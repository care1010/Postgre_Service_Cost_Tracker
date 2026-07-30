import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import KpiCards from '../components/KpiCards';
import AsblModal from '../components/AsblModal';
import ReviewChanges from './ReviewChanges';
import Swal from 'sweetalert2';
import { HiOutlineFilter, HiOutlineViewGrid, HiOutlineSearch, HiOutlineRefresh, HiChevronRight, HiChevronLeft } from "react-icons/hi";

const SummaryView = ({ user }) => {
    const [filters, setFilters] = useState({
        category_type: ['All'], bu: [], customer: [], loa_id: [], loa_name: [], wbs_type: [], wbs_description: [], wbs: [], active_inactive: ['Active'], period: []
    });

    const [options, setOptions] = useState({});
    const [kpiData, setKpiData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showAll, setShowAll] = useState(false); 
    const [loading, setLoading] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [collapseView, setCollapseView] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleReviewClick = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/check-pending-changes`);
            if (res.data.count > 0) { setIsReviewMode(true); } 
            else { Swal.fire({ icon: 'info', title: 'No Changes', text: 'No changes to show on Review.', confirmButtonColor: '#3b82f6' }); }
        } catch (err) { console.error("Check failed", err); }
    };

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const userType = user?.type || 'user';
                const customers = user?.allowedCustomers ? user.allowedCustomers.join(',') : '';
                const params = new URLSearchParams({ ...filters, type: userType, allowedCustomers: customers });
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/filter-options?${params.toString()}`);
                setOptions(res.data);
            } catch (err) { console.error("Error fetching filter options:", err); }
        };
        if (user) fetchOptions();
    }, [user, filters]);

    const handleFilterChange = (name, value) => setFilters(prev => ({ ...prev, [name]: value }));
    const handleReset = () => setFilters({ category_type: ['All'], bu: [], customer: [], loa_id: [], loa_name: [], wbs_type: [], wbs: [], wbs_description: [], active_inactive: ['Active'], period: [] });
    const handleKpiUpdate = useCallback((data) => setKpiData(data), []);

    const handleFullRefresh = async () => {
        const result = await Swal.fire({ title: "Sync Database?", text: "This process may take 1-2 minutes.", icon: "warning", showCancelButton: true, confirmButtonText: "Yes, Sync" });
        if (!result.isConfirmed) return;
        Swal.fire({ title: "Syncing Database...", text: "Please wait", allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/data/full-refresh`);
            await Swal.fire({ icon: "success", title: "Sync Completed", text: res.data.message });
            window.location.reload();
        } catch (err) { Swal.fire({ icon: "error", title: "Sync Failed", text: "Something went wrong" }); }
    };

    const queryParams = new URLSearchParams(filters);
    queryParams.append('showAll', showAll);
    queryParams.append('type', user?.type); 
    if (user?.allowedCustomers) queryParams.append('allowedCustomers', user.allowedCustomers.join(',')); 

    const dynamicApiUrl = collapseView
        ? `${process.env.REACT_APP_API_URL}/api/data/wbs-summary-collapse?${queryParams.toString()}`
        : `${process.env.REACT_APP_API_URL}/api/data/wbs-summary?${queryParams.toString()}`;

    const tableColumns = [
        { header: 'BU', field: 'bu' }, { header: 'Customer', field: 'customer' }, { header: 'LOA Name', field: 'loa_name' }, { header: 'LOA ID', field: 'loa_id' }, { header: 'Cost / Revenue', field: 'cost_revenue' }, { header: 'Category', field: 'categories' }, { header: 'ASBL', field: 'asbl' }, { header: 'ASBL LOA', field: 'asbl_loa' }, { header: 'PTD', field: 'ptd', clickable: true }, { header: 'Open Commitment', field: 'open_commitment_KEUR', clickable: true }, { header: 'Non Committed', field: 'non_committed_editable' }, { header: 'EAC', field: 'eac' }, { header: 'EAC vs ASBL', field: 'eac_vs_asbl' }
    ];

    if (isReviewMode) return <ReviewChanges onBack={() => setIsReviewMode(false)} />;

    return (
        <div className="flex bg-[#f8fafc] min-h-screen relative overflow-hidden">
            
            {/* 🟢 MAIN CONTENT AREA */}
            <div className={`flex-1 p-5 transition-all duration-300 ${isSidebarOpen ? 'mr-[380px]' : 'mr-[40px]'}`}>
                {loading && (
                    <div className="fixed inset-0 z-[3000] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center text-white">
                        <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <h2 className="text-xl font-bold">Performing Full System Sync...</h2>
                    </div>
                )}

                {/* KPI & Actions Header */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6 items-stretch">
                    <div className="flex-1"><KpiCards data={kpiData} /></div>
                    <div className="flex gap-3">
                        <button onClick={() => window.location.reload()} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 text-slate-600 transition-all" title="Refresh Page"><HiOutlineRefresh className="text-lg"/></button>
                        
                        {/* <button
                            onClick={() => setShowAll(!showAll)}
                            className={`
                                border
                                border-slate-300
                                ${showAll ? "border-t-4 border-t-orange-600" : "border-t-4 border-t-blue-600"}
                                bg-white
                                px-5
                                py-2
                                shadow-sm
                                hover:shadow-md
                                transition-all
                                duration-200
                                hover:-translate-y-0.5
                                flex
                                items-center
                                gap-2
                            `}
                        >
                            <span className={`text-sm font-semibold ${showAll ? "text-orange-700" : "text-blue-700"}`}>
                                {showAll ? "Active" : "All Categories"}
                            </span>
                        </button> */}

                        {(user?.type === 'admin' || user?.type === 'super_admin') && (
                            <>
                                {/* 🔥 REVIEW BUTTON RESTORED */}
                                <button
                                    onClick={handleReviewClick}
                                    className="
                                        border
                                        border-slate-300
                                        border-t-4
                                        border-t-green-600
                                        bg-white
                                        px-5
                                        py-2
                                        shadow-sm
                                        hover:shadow-md
                                        transition-all
                                        duration-200
                                        hover:-translate-y-0.5
                                        flex
                                        items-center
                                        gap-2
                                    "
                                >
                                    <HiOutlineSearch className="text-lg text-green-700" />
                                    <span className="text-sm font-semibold text-green-700">
                                        Review
                                    </span>
                                </button>

                                {/* SYNC DATABASE BUTTON */}
                                <button
                                    onClick={handleFullRefresh}
                                    className="
                                        border
                                        border-slate-300
                                        border-t-4
                                        border-t-slate-800
                                        bg-white
                                        px-5
                                        py-2
                                        shadow-sm
                                        hover:shadow-md
                                        transition-all
                                        duration-200
                                        hover:-translate-y-0.5
                                        flex
                                        items-center
                                        gap-2
                                    "
                                >
                                    <span className="text-sm font-semibold text-slate-800">
                                        Sync Database
                                    </span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* 🔥 WARNING BANNER RESTORED */}
                {(!filters.wbs_type || filters.wbs_type === 'All' || filters.wbs_type.length === 0 || String(filters.wbs_type).toLowerCase().includes('warranty/other')) && (
                    <div className="mb-6 p-4 border border-orange-200 bg-orange-50/80 rounded-3xl text-sm text-orange-800 flex items-center gap-3 animate-pulse shadow-sm">
                        <span className="text-lg">⚠️</span>
                        <div>
                            <span className="font-extrabold uppercase tracking-wide mr-1.5">ASBL Columns Locked:</span>
                            {String(filters.wbs_type).toLowerCase().includes('warranty/other')
                                ? "ASBL values are not applicable for 'Warranty/Other' WBS Type."
                                : "Please select a specific WBS Type (e.g. Project or AMC) from the Filter Pane to unlock ASBL values."}
                        </div>
                    </div>
                )}

                {/* DATA TABLE */}
                <div className="rounded-[1.5rem] overflow-hidden shadow-xl border border-white bg-white w-full">
                    <DataTable title="" columns={tableColumns} apiUrl={dynamicApiUrl} filters={filters} onKpiUpdate={handleKpiUpdate} collapseView={collapseView} user={user} />
                </div>

                {/* 🔥 BOTTOM NOTE RESTORED */}
                <div className="mt-6 mb-4 px-5 py-4 border border-amber-200 rounded-2xl text-[13px] text-slate-800 bg-amber-50/60 shadow-sm leading-relaxed">
                    <span className="font-black text-amber-800 uppercase tracking-tighter mr-2">Note:</span>{" "}
                    This tool is to be used to track Services Cost "– EAC vs ASBL". 
                    Please ignore revenue figures, as these figures are not validated.
                </div>
            </div>

            {/* 🔵 POWER BI STYLE SIDEBAR */}
            <div 
                className={`fixed right-0 top-0 h-full bg-white border-l border-slate-200 transition-all duration-300 z-[2001] shadow-2xl flex ${isSidebarOpen ? 'w-[380px]' : 'w-[40px]'}`}
            >
                <div 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`h-full flex flex-col items-center pt-8 cursor-pointer hover:bg-slate-50 transition-colors ${isSidebarOpen ? 'w-[40px] border-r border-slate-100' : 'w-full'}`}
                >
                    <HiOutlineFilter className="text-xl mb-4 text-blue-600" />
                    {!isSidebarOpen && (
                        <span 
                            className="font-black text-[13px] tracking-[0.2em] text-slate-700 uppercase"
                            style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
                        >
                            Filters
                        </span>
                    )}
                    {isSidebarOpen && <HiChevronRight className="text-slate-300 mt-auto mb-10 text-xl" />}
                </div>

                {isSidebarOpen && (
                    <div className="flex-1 flex flex-col animate-in fade-in duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <span className="font-black text-lg text-slate-800 tracking-tight">Filters Pane</span>
                            <button onClick={handleReset} className="text-[11px] font-black uppercase text-red-500 hover:underline">Reset All</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <FilterBar filters={filters} options={options} onFilterChange={handleFilterChange} onReset={handleReset} />
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                            <button onClick={() => setIsSidebarOpen(false)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">Apply Filters</button>
                        </div>
                    </div>
                )}
            </div>

            <AsblModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={(data) => setIsModalOpen(false)} />
        </div>
    );
};

export default SummaryView;