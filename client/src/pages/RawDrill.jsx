import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FilterBar from '../components/FilterBar';
import { HiOutlineFilter, HiOutlineUpload, HiDatabase } from "react-icons/hi";
import $ from 'jquery';
import 'datatables.net-dt';

const RawDrill = ({ user, filters, onFilterChange, onResetFilters }) => {
    const [activeTab, setActiveTab] = useState('cj74'); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [options, setOptions] = useState({});
    
    const containerRef = useRef(null);
    const dataTableInstance = useRef(null);

    // Columns Mapping (Exclusions applied)
    const getColumns = (tab) => {
        if (tab === 'cj74') {
            const cj74Cols = [
                'id', 'sap_wbs', 'year', 'per', 'cost_element', 'cost_element_name', 'ptd_val', 'period',
                'cocd', 'proj_def', 'profit_ctr', 'name2', 'tcurr', 'value_trancurr', 'obcur',
                'val_in_obj_crcy', 'val_in_rc', 'rcurr', 'cost_element_descr', 'refdocno',
                'document_no', 'doc_date', 'postg_date', 'offst_acct', 'name_of_offsetting_account',
                'material', 'material_description', 'name1', 'name22', 'created_on', 'origin_form',
                'user_name', 'pur_doc', 'quantity', 'purchase_order_text', 'loa_id'
            ];
            return cj74Cols.map(col => ({
                title: col.replace(/_/g, ' ').toUpperCase(),
                data: col,
                render: (data) => {
                    if (col === 'ptd_val') return `<b>${Number(data || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</b>`;
                    if (col.includes('date') || col === 'created_on') return data ? new Date(data).toLocaleDateString('en-GB') : '-';
                    return data || '-';
                },
                className: col === 'ptd_val' ? 'text-right' : 'text-left',
                defaultContent: "-"
            }));
        } else {
            const cji5Cols = [
                'id', 'project_def', 'sap_wbs', 'refdocno', 'item', 'co_object_name', 'supplier', 'name',
                'exch_rate', 'year', 'per', 'cost_element', 'cost_element_descr', 'matl_group', 'material',
                'description', 'user_name', 'docc', 'quantity', 'qty_plan', 'debit_date', 'doc_date',
                'cocode', 'report_currency', 'val_in_rep_cur', 'tcurr', 'value_tcur', 'obj_curr',
                'value_in_obj_crcy', 'oc_val', 'loa_id'
            ];
            return cji5Cols.map(col => ({
                title: col.replace(/_/g, ' ').toUpperCase(),
                data: col,
                render: (data) => {
                    if (col === 'oc_val') return `<b>${Number(data || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</b>`;
                    if (col.includes('date')) return data ? new Date(data).toLocaleDateString('en-GB') : '-';
                    return data || '-';
                },
                className: col === 'oc_val' ? 'text-right' : 'text-left',
                defaultContent: "-"
            }));
        }
    };

    // Filter Sync
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([k, v]) => {
                    if (v && v.length > 0 && !v.includes('All')) params.append(k, v.join(','));
                });
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/filter-options?${params.toString()}`);
                setOptions(res.data);
            } catch (err) { console.error("Filter Fetch Error:", err); }
        };
        fetchOptions();
    }, [filters]);

    // 🔥 THE FIX: Use a robust lifecycle management
    useEffect(() => {
        let isCancelled = false;

        const initTable = () => {
            // 1. Cleanup purana instance
            if (dataTableInstance.current) {
                dataTableInstance.current.destroy(true);
                dataTableInstance.current = null;
            }

            // 2. Clear Container aur fresh element add karo
            if (containerRef.current) {
                $(containerRef.current).empty();
                // Important: DataTables needs <thead> to calculate widths correctly
                $(containerRef.current).append('<table class="display nowrap cell-border pbi-table" style="width:100%"><thead></thead></table>');
            }

            // 3. Small Delay taaki browser layout confirm kar le (Sizing fix)
            setTimeout(() => {
                if (isCancelled || !containerRef.current) return;

                const tableElement = $(containerRef.current).find('table');
                
                dataTableInstance.current = tableElement.DataTable({
                    serverSide: true,
                    processing: true,
                    scrollX: true,
                    autoWidth: false, // 🔥 Important: Manual sizing prevent clientWidth error
                    pageLength: 50,
                    ajax: {
                        url: `${process.env.REACT_APP_API_URL}/api/data/raw-get-data`,
                        data: (d) => {
                            const params = { ...d, tableType: activeTab, type: user?.type };
                            Object.entries(filters).forEach(([k, v]) => {
                                if (v && v.length > 0 && !v.includes('All')) params[k] = Array.isArray(v) ? v.join(',') : v;
                            });
                            return params;
                        }
                    },
                    columns: getColumns(activeTab),
                    dom: '<"flex justify-between mb-4"lf>rt<"flex justify-between mt-4"ip>',
                });
            }, 50); 
        };

        initTable();

        return () => {
            isCancelled = true;
            if (dataTableInstance.current) {
                dataTableInstance.current.destroy(true);
                dataTableInstance.current = null;
            }
        };
    }, [activeTab, filters]);

    const handleExport = () => {
        const params = new URLSearchParams();
        params.append('tableType', activeTab);
        params.append('type', user?.type || '');
        Object.entries(filters).forEach(([k, v]) => {
            if (v && v.length > 0 && !v.includes('All')) params.append(k, v.join(','));
        });
        window.location.href = `${process.env.REACT_APP_API_URL}/api/data/raw-export?${params.toString()}`;
    };

    return (
        <div className="flex bg-[#f8fafc] min-h-screen relative overflow-hidden font-['Calibri']">
            <div className={`flex-1 p-6 transition-all duration-300 ${isSidebarOpen ? 'mr-[380px]' : 'mr-[40px]'}`}>
                
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-800 p-2 rounded-lg text-white shadow-lg"><HiDatabase size={24}/></div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Line Item Explorer</h1>
                    </div>
                    <button onClick={handleExport} className="bg-white border-b-4 border-blue-500 shadow-md px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95">
                        <HiOutlineUpload className="text-blue-600"/> Export Data
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
                    <button onClick={() => setActiveTab('cj74')} className={`px-10 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'cj74' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>CJ74 (Actuals)</button>
                    <button onClick={() => setActiveTab('cji5')} className={`px-10 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'cji5' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>CJI5 (Commitment)</button>
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100 min-h-[500px] overflow-hidden">
                    <div
                    ref={containerRef}
                    className="w-full overflow-x-scroll overflow-y-hidden custom-scrollbar"
                    style={{
                        width: "100%",
                        maxWidth: "100%",
                        whiteSpace: "nowrap"
                    }}
                >
                        {/* Table injected here */}
                    </div>
                </div>
            </div>

            {/* Sidebar Filters */}
            <div className={`fixed right-0 top-0 h-full bg-white border-l border-slate-200 transition-all duration-300 z-[2001] shadow-2xl flex ${isSidebarOpen ? 'w-[380px]' : 'w-[40px]'}`}>
                <div onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="h-full flex flex-col items-center pt-8 cursor-pointer hover:bg-slate-50 transition-colors w-[40px]">
                    <HiOutlineFilter className="text-xl mb-4 text-blue-600" />
                    {!isSidebarOpen && <span className="font-black text-[13px] tracking-[0.2em] text-slate-700 uppercase" style={{ writingMode: 'vertical-lr' }}>Filters Pane</span>}
                </div>
                {isSidebarOpen && (
                    <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b">
                            <span className="font-black text-lg text-slate-800 uppercase tracking-tighter">Global Filters</span>
                            <button onClick={onResetFilters} className="text-xs font-bold text-red-500 uppercase hover:underline">Reset All</button>
                        </div>
                        <FilterBar filters={filters} options={options} onFilterChange={onFilterChange} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default RawDrill;