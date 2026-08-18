import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { HiOutlineRefresh, HiOutlineUpload, HiOutlineUsers, HiSearch, HiX, HiCalendar, HiChevronDown } from 'react-icons/hi';

const Logs = () => {
    // 1. Current Month-Year (e.g., Aug-2026)
    const currentMonthYear = new Date().toLocaleString('en-US', { month: 'short' }) + '-' + new Date().getFullYear();

    const [activeTab, setActiveTab] = useState('non-committed'); 
    const [logs, setLogs] = useState([]);
    const [asblLogs, setAsblLogs] = useState([]);
    const [projectLogs, setProjectLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPending, setShowPending] = useState(false);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [logSearch, setLogSearch] = useState('');
    const [pendingSearch, setPendingSearch] = useState('');
    
    // 🔥 Month Filter State (Default: Current Month)
    const [selectedMonth, setSelectedMonth] = useState(currentMonthYear);

    useEffect(() => {
        fetchAllLogs();
    }, []);

    const fetchAllLogs = async () => {
        setLoading(true);
        try {
            const [ncRes, asblRes, projRes] = await Promise.all([
                axios.get(`${process.env.REACT_APP_API_URL}/api/data/user-activity-logs`),
                axios.get(`${process.env.REACT_APP_API_URL}/api/data/asbl-activity-logs`),
                axios.get(`${process.env.REACT_APP_API_URL}/api/data/project-activity-logs`)
            ]);
            setLogs(ncRes.data || []);
            setAsblLogs(asblRes.data || []);
            setProjectLogs(projRes.data || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    // 🔥 Dynamic Month List: Extracts all unique months from DB data
    const availableMonths = useMemo(() => {
        const allRecords = [...logs, ...asblLogs, ...projectLogs];
        const monthSet = new Set();
        
        // Data se saare unique months nikaalo
        allRecords.forEach(item => {
            if (item.month_year && item.month_year !== '-') {
                monthSet.add(item.month_year);
            }
        });

        // Ensure current month is always in the list
        monthSet.add(currentMonthYear);

        // Sort months descending (Latest first)
        return Array.from(monthSet).sort((a, b) => {
            const dateA = new Date(a.split('-')[0] + " 1, " + a.split('-')[1]);
            const dateB = new Date(b.split('-')[0] + " 1, " + b.split('-')[1]);
            return dateB - dateA;
        });
    }, [logs, asblLogs, projectLogs, currentMonthYear]);

    // 🔥 Filter Logic: Search + Month Sync
    const currentData = activeTab === 'non-committed' ? logs : (activeTab === 'asbl' ? asblLogs : projectLogs);
    
    const filteredLogs = currentData.filter((row) => {
        const matchesMonth = selectedMonth === 'All' || row.month_year === selectedMonth;
        const matchesSearch = Object.values(row).some((val) =>
            String(val ?? "").toLowerCase().includes(logSearch.toLowerCase())
        );
        return matchesMonth && matchesSearch;
    });

    const fetchPendingUsers = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/pending-users`);
            setPendingUsers(res.data || []);
            setShowPending(true);
        } catch (err) { console.error(err); }
    };

    const exportToExcel = () => {
        const exportData = filteredLogs.map(row => ({
            User: row.user_email,
            LOA_ID: row.loa_id,
            LOA: row.loa_name,
            Category: row.categories,
            Value_Change: `${row.old_value} -> ${row.new_value}`,
            Month: row.month_year,
            Timestamp: new Date(row.created_at).toLocaleString()
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Audit_Logs');
        XLSX.writeFile(wb, `${activeTab}_${selectedMonth}_Logs.xlsx`);
    };

    return (
        <div className="p-6 font-['Calibri']">
            <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100">
                
                {/* HEADER SECTION */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Activity Logs</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase mt-1">Showing history for: <span className="text-blue-600">{selectedMonth === 'All' ? 'Full History' : selectedMonth}</span></p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        
                        {/* 🔥 INTERACTIVE MONTH FILTER */}
                        <div className="relative group">
                            <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 z-10" />
                            <select 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="pl-10 pr-10 py-2.5 bg-blue-50 border-2 border-blue-100 text-blue-700 rounded-xl text-sm font-black outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm group-hover:bg-blue-100"
                            >
                                <option value="All">📅 All History</option>
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>{m === currentMonthYear ? `🌟 ${m} (Current)` : m}</option>
                                ))}
                            </select>
                            <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search logs..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-60 font-bold" />
                        </div>

                        <button onClick={exportToExcel} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all"><HiOutlineUpload /> Export</button>
                        <button onClick={fetchPendingUsers} className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all"><HiOutlineUsers /> Pending</button>
                        <button onClick={fetchAllLogs} className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-400 hover:text-blue-600 transition-all"><HiOutlineRefresh className={loading ? "animate-spin" : ""} /></button>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
                    {['non-committed', 'asbl', 'add-project'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-3 rounded-xl font-black text-xs uppercase transition-all duration-300 ${activeTab === tab ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>
                            {tab.replace('-', ' ')}
                        </button>
                    ))}
                </div>

                {/* TABLE (Logic remains same, data is filtered by selectedMonth) */}
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/20 shadow-inner">
                    <div className="overflow-x-auto max-h-[550px] custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-800 text-white sticky top-0 z-10">
                                {/* ... (Headers same as previous code) ... */}
                                <tr>
                                    {activeTab === 'non-committed' ? (
                                        <>
                                            <th className="p-4 text-[13px] uppercase">BU</th>
                                            <th className="p-4 text-[13px] uppercase">Customer</th>
                                            <th className="p-4 text-[13px] uppercase">LOA Name</th>
                                            <th className="p-4 text-[13px] uppercase text-blue-300">LOA ID</th>
                                            <th className="p-4 text-[13px] uppercase">Category</th>
                                            <th className="p-4 text-[13px] uppercase text-right">Old Val</th>
                                            <th className="p-4 text-[13px] uppercase text-right text-emerald-300">New Val</th>
                                            <th className="p-4 text-[13px] uppercase">Month</th>
                                            <th className="p-4 text-[13px] uppercase">User</th>
                                            <th className="p-4 text-[13px] uppercase text-center">Time</th>
                                        </>
                                    ) : activeTab === 'asbl' ? (
                                        <>
                                            <th className="p-4 text-[13px] uppercase text-blue-300">LOA ID</th>
                                            <th className="p-4 text-[13px] uppercase">LOA Name</th>
                                            <th className="p-4 text-[13px] uppercase">Type</th>
                                            <th className="p-4 text-[13px] uppercase">Category</th>
                                            <th className="p-4 text-[13px] uppercase text-right">Old ASBL</th>
                                            <th className="p-4 text-[13px] uppercase text-right text-blue-300">New ASBL</th>
                                            <th className="p-4 text-[13px] uppercase">Month</th>
                                            <th className="p-4 text-[13px] uppercase">User</th>
                                            <th className="p-4 text-[13px] uppercase text-center">Time</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="p-4 text-[13px] uppercase text-blue-300">LOA ID</th>
                                            <th className="p-4 text-[13px] uppercase">LOA Name</th>
                                            <th className="p-4 text-[13px] uppercase">Action</th>
                                            <th className="p-4 text-[13px] uppercase text-center">WBS Count</th>
                                            <th className="p-4 text-[13px] uppercase text-center">Month</th>
                                            <th className="p-4 text-[13px] uppercase">User</th>
                                            <th className="p-4 text-[13px] uppercase text-center">Time</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y">
                                {loading ? (
                                    <tr><td colSpan="10" className="p-20 text-center font-bold text-slate-400 uppercase tracking-widest">Loading records...</td></tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr><td colSpan="10" className="p-20 text-center text-slate-300 font-bold uppercase">No data found for {selectedMonth}</td></tr>
                                ) : filteredLogs.map((row) => (
                                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                                        {/* ... (Body mapping same as previous code) ... */}
                                        {activeTab === 'non-committed' && (
                                            <>
                                                <td className="p-4 font-bold text-xs">{row.bu}</td>
                                                <td className="p-4 text-xs truncate max-w-[120px]">{row.customer}</td>
                                                <td className="p-4 text-xs truncate max-w-[150px]">{row.loa_name}</td>
                                                <td className="p-4 font-black text-blue-700 text-xs">{row.loa_id}</td>
                                                <td className="p-4 text-xs text-slate-500">{row.categories}</td>
                                                <td className="p-4 text-right font-mono text-xs">{Number(row.old_value || 0).toFixed(2)}</td>
                                                <td className="p-4 text-right font-mono text-xs text-emerald-600 font-bold">{Number(row.new_value || 0).toFixed(2)}</td>
                                                <td className="p-4 text-xs font-bold text-slate-600">{row.month_year}</td>
                                                <td className="p-4 text-xs">{row.user_email}</td>
                                                <td className="p-4 text-[11px] text-slate-400 text-center">{new Date(row.created_at).toLocaleString()}</td>
                                            </>
                                        )}
                                        {activeTab === 'asbl' && (
                                            <>
                                                <td className="p-4 font-black text-blue-700 text-xs">{row.loa_id}</td>
                                                <td className="p-4 text-xs truncate max-w-[200px]">{row.loa_name}</td>
                                                <td className="p-4"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black">{row.wbs_type}</span></td>
                                                <td className="p-4 text-xs text-slate-500">{row.categories}</td>
                                                <td className="p-4 text-right font-mono text-xs">{Number(row.old_value || 0).toFixed(2)}</td>
                                                <td className="p-4 text-right font-mono text-xs text-blue-600 font-bold">{Number(row.new_value || 0).toFixed(2)}</td>
                                                <td className="p-4 text-xs font-bold text-slate-600">{row.month_year || '-'}</td>
                                                <td className="p-4 text-xs">{row.user_email}</td>
                                                <td className="p-4 text-[11px] text-slate-400 text-center">{new Date(row.created_at).toLocaleString()}</td>
                                            </>
                                        )}
                                        {activeTab === 'add-project' && (
                                            <>
                                                <td className="p-4 font-black text-blue-700 text-xs">{row.loa_id}</td>
                                                <td className="p-4 text-xs truncate max-w-[200px]">{row.loa_name}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${row.action_mode === 'New Project' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        {row.action_mode}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center font-bold text-xs">{row.wbs_count}</td>
                                                <td className="p-4 text-xs font-bold text-slate-600 text-center">{row.month_year || '-'}</td>
                                                <td className="p-4 text-xs">{row.user_email}</td>
                                                <td className="p-4 text-[11px] text-slate-400 text-center">{new Date(row.created_at).toLocaleString()}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* Modal Pending Users code remains unchanged... */}
        </div>
    );
};

export default Logs;