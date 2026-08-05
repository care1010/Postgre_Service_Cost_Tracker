import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import $ from 'jquery';
import Swal from "sweetalert2";
import { 
    HiOutlineDownload, 
    HiOutlineArrowLeft, 
    HiOutlineLightningBolt, 
    HiOutlineFilter, 
    HiChevronRight 
} from "react-icons/hi";

// ─────────────────────────────────────────────────────────────
// Helper: query params builder
// ─────────────────────────────────────────────────────────────
const buildQueryParams = (filters, extra = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
        const val = filters[key];
        if (Array.isArray(val)) {
            const cleaned = [...new Set(val)].filter(v => v && v !== 'All');
            if (cleaned.length > 0) params.append(key, cleaned.join(','));
        } else if (val && val !== 'All') {
            params.append(key, val);
        }
    });
    Object.keys(extra).forEach(k => {
        if (extra[k] !== undefined && extra[k] !== null && extra[k] !== '') {
            params.append(k, extra[k]);
        }
    });
    return params;
};

const ReviewChanges = ({ user, filters, onFilterChange, onResetFilters, onBack }) => {
    const [options, setOptions] = useState({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const allowedCustomers = [...new Set(user?.allowedCustomers || [])];

    // ─── FETCH FILTER OPTIONS (Sidebar ke liye) ───
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const params = buildQueryParams(filters, {
                    type: user?.type,
                    allowedCustomers: allowedCustomers.join(',')
                });
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/filter-options?${params.toString()}`);
                setOptions(res.data);
            } catch (err) { console.error(err); }
        };
        fetchOptions();
    }, [filters, user]);

    const handleExportReview = () => {
        const params = buildQueryParams(filters, {
            type: user?.type,
            allowedCustomers: allowedCustomers.join(',')
        });
        window.location.href = `${process.env.REACT_APP_API_URL}/api/data/export-review?${params.toString()}`;
    };

    const handleFinalize = async () => {
        const pendingUpdates = [];
        $('.nc-input.is-changed').each(function () {
            pendingUpdates.push({
                loa_name: $(this).data('loa'),
                categories: $(this).data('cat'),
                value: $(this).val()
            });
        });

        const result = await Swal.fire({
            title: "Submit Data?",
            text: "This will update the main Summary View.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, Submit",
            confirmButtonColor: "#4169e1"
        });

        if (!result.isConfirmed) return;
        Swal.fire({ title: "Submitting...", didOpen: () => Swal.showLoading() });

        try {
            if (pendingUpdates.length > 0) {
                await axios.post(`${process.env.REACT_APP_API_URL}/api/data/update-non-committed`, { 
                    updates: pendingUpdates,
                    createdBy: user?.name || user?.email || 'System'
                });
            }
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/data/finalize-changes`);
            await Swal.fire("Success", res.data.message, "success");
            onBack();
        } catch (err) { Swal.fire("Error", "Submission failed", "error"); }
    };

    // ─── TABLE COLUMNS (Perfect Alignment Restore) ───
    // Column count must match exactly to avoid shifting
    const tableColumns = [
        { header: 'BU', field: 'bu' },
        { header: 'Customer', field: 'customer' },
        { header: 'LOA Name', field: 'loa_name' },
        { header: 'LOA ID', field: 'loa_id' },
        { header: 'Cost/Rev', field: 'cost_revenue' },
        { header: 'Category', field: 'categories' },
        { header: 'ASBL', field: 'asbl' },
        // { header: 'ASBL LOA', field: 'asbl_loa' }, // 🔥 Restored missing column
        { header: 'PTD', field: 'ptd' },
        { header: 'Open Commitment', field: 'open_commitment' },
        { header: 'Old Value', field: 'non_committed_original' },
        
        // 🔥 Editable Column with fixed width
        { 
            header: 'Non Committed (EDIT)', 
            field: 'non_committed',
            render: (val, row) => {
                const displayVal = (val !== undefined && val !== null) ? val : 0;
                return `
                    <div style="display: flex; justify-content: flex-end;">
                        <input 
                            type="number" step="0.01" 
                            value="${displayVal}" 
                            class="nc-input is-changed"
                            data-loa="${row.loa_name}" 
                            data-cat="${row.categories}"
                            style="width: 100px; padding: 4px 8px; text-align: right; border: 2px solid #60a5fa; border-radius: 8px; background: #eff6ff; font-weight: bold; color: #1e40af; outline: none;"
                        />
                    </div>`;
            }
        },
        { header: 'EAC', field: 'eac' },
        { header: 'EAC vs ASBL', field: 'eac_vs_asbl' }
    ];

    const dynamicApiUrl = `${process.env.REACT_APP_API_URL}/api/data/review-changes?${buildQueryParams(filters, { type: user?.type, allowedCustomers: allowedCustomers.join(',') }).toString()}`;

    return (
        <div className="flex bg-[#f8fafc] min-h-screen relative overflow-hidden">
            
            <div className={`flex-1 p-6 transition-all duration-300 ${isSidebarOpen ? 'mr-[380px]' : 'mr-[40px]'}`}>
                
                <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-150">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Non-Committed Changes Summary</h2>
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Review & Submit Changes</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onBack} className="bg-slate-600 text-white px-5 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm hover:bg-slate-700 transition-all shadow-md"><HiOutlineArrowLeft /> Back</button>
                        <button onClick={handleExportReview} className="bg-blue-600 text-white px-5 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm hover:bg-blue-700 transition-all shadow-md"><HiOutlineDownload /> Export</button>
                        <button onClick={handleFinalize} className="bg-indigo-600 text-white px-6 py-2 rounded-2xl flex items-center gap-2 font-black uppercase text-xs tracking-wider hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"><HiOutlineLightningBolt /> Submit Data</button>
                    </div>
                </div>

                <div className="rounded-[1.5rem] shadow-xl border border-slate-100 bg-white w-full min-h-[400px]"> 
                {/* min-h add karne se layout collapse nahi hoga */}
                <DataTable 
                    key={dynamicApiUrl} 
                    title="" 
                    columns={tableColumns} 
                    apiUrl={dynamicApiUrl} 
                    filters={filters} 
                    onKpiUpdate={() => {}} 
                    showSaveButton={false} 
                    showClearButton={true} 
                    collapseView={false} 
                    user={user}
                />
            </div>
            </div>

            {/* 🔵 SIDEBAR */}
            <div className={`fixed right-0 top-0 h-full bg-white border-l border-slate-200 transition-all duration-300 z-[2001] shadow-2xl flex ${isSidebarOpen ? 'w-[380px]' : 'w-[40px]'}`}>
                <div onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`h-full flex flex-col items-center pt-8 cursor-pointer hover:bg-slate-50 transition-colors ${isSidebarOpen ? 'w-[40px] border-r border-slate-100' : 'w-full'}`}>
                    <HiOutlineFilter className="text-xl mb-4 text-blue-600" />
                    {!isSidebarOpen && <span className="font-black text-[13px] tracking-[0.2em] text-slate-700 uppercase" style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}>Filters</span>}
                    {isSidebarOpen && <HiChevronRight className="text-slate-300 mt-auto mb-10 text-xl" />}
                </div>

                {isSidebarOpen && (
                    <div className="flex-1 flex flex-col animate-in fade-in duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <span className="font-black text-lg text-slate-800">Filters Pane</span>
                            <button onClick={onResetFilters} className="text-[11px] font-black uppercase text-red-500">Reset All</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <FilterBar filters={filters} options={options} onFilterChange={onFilterChange} onReset={onResetFilters} />
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-white">
                            <button onClick={() => setIsSidebarOpen(false)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-blue-700">Apply Filters</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewChanges;