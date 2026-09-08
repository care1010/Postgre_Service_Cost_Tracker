import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
    HiOutlineRefresh, HiOutlineUpload, HiOutlineUsers, HiSearch, 
    HiX, HiCalendar, HiChevronDown, HiOutlineClipboardList 
} from 'react-icons/hi';

const Logs = ({ user }) => {
    // 1. Current Month-Year (e.g., Aug-2026)
    const currentMonthYear = new Date().toLocaleString('en-US', { month: 'short' }) + '-' + new Date().getFullYear();

    const [activeTab, setActiveTab] = useState('non-committed'); 
    const [logs, setLogs] = useState([]);
    const [asblLogs, setAsblLogs] = useState([]);
    const [projectLogs, setProjectLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showPending, setShowPending] = useState(false);
    const [pendingUsers, setPendingUsers] = useState([]);

    const [showPendingLoas, setShowPendingLoas] = useState(false);
    const [pendingLoas, setPendingLoas] = useState([]);

    const [logSearch, setLogSearch] = useState('');
    const [pendingSearch, setPendingSearch] = useState('');
    
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
        } catch (err) { 
            console.error("Fetch Logs Error:", err); 
        } finally { 
            setLoading(false); 
        }
    };

    const fetchPendingUsers = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/pending-users`);
            setPendingUsers(res.data || []);
            setShowPending(true);
        } catch (err) { console.error(err); }
    };

    const fetchPendingLoas = async () => {
    console.log("Button Clicked! Fetching for user:", user?.email); // 🔥 Debug log
        try {
            const params = new URLSearchParams({
                type: user?.type || 'user',
                allowedCustomers: (user?.allowedCustomers || []).join(',')
            });

            console.log("Requesting URL:", `${process.env.REACT_APP_API_URL}/api/data/pending-loas?${params.toString()}`);

            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/pending-loas?${params.toString()}`);
            
            console.log("Data received from backend:", res.data); // 🔥 Check result

            const data = Array.isArray(res.data) ? res.data : [];
            setPendingLoas(data);
            setShowPendingLoas(true);
        } catch (err) { 
            console.error("Fetch Pending LOAs Error:", err); 
            alert("Failed to fetch pending LOAs. Check console for details.");
            setPendingLoas([]); 
        }
    };

    const availableMonths = useMemo(() => {
        const allRecords = [...logs, ...asblLogs, ...projectLogs];
        const monthSet = new Set();
        allRecords.forEach(item => { if (item.month_year && item.month_year !== '-') monthSet.add(item.month_year); });
        monthSet.add(currentMonthYear);
        return Array.from(monthSet).sort((a, b) => {
            const dateA = new Date(a.split('-')[0] + " 1, " + a.split('-')[1]);
            const dateB = new Date(b.split('-')[0] + " 1, " + b.split('-')[1]);
            return dateB - dateA;
        });
    }, [logs, asblLogs, projectLogs, currentMonthYear]);

    const currentData = activeTab === 'non-committed' ? logs : (activeTab === 'asbl' ? asblLogs : projectLogs);
    
    const filteredLogs = currentData.filter((row) => {
        const matchesMonth = selectedMonth === 'All' || row.month_year === selectedMonth;
        const matchesSearch = Object.values(row).some((val) =>
            String(val ?? "").toLowerCase().includes(logSearch.toLowerCase())
        );
        return matchesMonth && matchesSearch;
    });

    const filteredPendingUsers = pendingUsers.filter((user) =>
        `${user.email} ${user.type}`.toLowerCase().includes(pendingSearch.toLowerCase())
    );

    const exportToExcel = () => {
        let exportData = filteredLogs.map(row => {
            if (activeTab === 'non-committed') {
                return { User: row.user_email, BU: row.bu, Customer: row.customer, LOA: row.loa_name, LOA_ID: row.loa_id, Category: row.categories, Old_Value: row.old_value, New_Value: row.new_value, Month: row.month_year, Time: new Date(row.created_at).toLocaleString() };
            } else if (activeTab === 'asbl') {
                return { User: row.user_email, LOA_ID: row.loa_id, LOA_Name: row.loa_name, WBS_Type: row.wbs_type, Category: row.categories, Old_ASBL: row.old_value, New_ASBL: row.new_value, Month: row.month_year, Time: new Date(row.created_at).toLocaleString() };
            } else {
                return { 'LOA ID': row.loa_id, 'Project Name': row.loa_name, 'Action': row.action_mode, 'WBS Elements': row.single_wbs, 'User': row.user_email, 'Month': row.month_year };
            }
        });
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs');
        XLSX.writeFile(workbook, `${activeTab}_Logs.xlsx`);
    };

    const exportPendingLoasToExcel = () => {
        if (pendingLoas.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(pendingLoas);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Pending_LOAs');
        XLSX.writeFile(workbook, `Pending_LOAs_${selectedMonth}.xlsx`);
    };

    const exportPendingUsers = () => {
        const exportData = filteredPendingUsers.map(user => ({ Email: user.email, Role: user.type }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Pending Users');
        XLSX.writeFile(workbook, `Pending_Users_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="p-6 font-['Calibri']">
            <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100">
                
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Activity Logs</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase mt-1">History for: <span className="text-blue-600">{selectedMonth}</span></p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 z-10" />
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="pl-10 pr-10 py-2.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl text-sm font-black outline-none appearance-none cursor-pointer">
                                <option value="All">All Months</option>
                                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} className="pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none w-48 font-bold" />
                        </div>
                        <button onClick={exportToExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-md"><HiOutlineUpload /> Export Logs</button>
                        <button onClick={fetchPendingLoas} className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-md"><HiOutlineClipboardList /> Pending LOAs</button>
                        <button onClick={fetchPendingUsers} className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-md"><HiOutlineUsers /> Pending Users</button>
                        <button onClick={fetchAllLogs} className="bg-white border p-2.5 rounded-xl"><HiOutlineRefresh className={loading ? "animate-spin" : ""} /></button>
                    </div>
                </div>

                <div className="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
                    {['non-committed', 'asbl', 'add-project'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-3 rounded-xl font-black text-xs uppercase transition-all ${activeTab === tab ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>
                            {tab.replace('-', ' ')}
                        </button>
                    ))}
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/20 shadow-inner">
                    <div className="overflow-x-auto max-h-[550px] custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-800 text-white sticky top-0 z-10">
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
                                            <th className="p-4 text-[13px] uppercase">WBS Elements</th>
                                            <th className="p-4 text-[13px] uppercase">User</th>
                                            <th className="p-4 text-[13px] uppercase text-center">Time</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y">
                                {loading ? (
                                    <tr><td colSpan="11" className="p-10 text-center font-bold text-slate-400">Loading...</td></tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr><td colSpan="11" className="p-10 text-center text-slate-300 font-bold uppercase">No records found</td></tr>
                                ) : filteredLogs.map((row) => (
                                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                                        {activeTab === 'non-committed' ? (
                                            <>
                                                <td className="p-4 font-bold text-[14px]">{row.bu}</td>
                                                <td className="p-4 text-[14px] truncate max-w-[120px]">{row.customer}</td>
                                                <td className="p-4 text-[14px] truncate max-w-[200px]">{row.loa_name}</td>
                                                <td className="p-4 font-black text-blue-700 text-[14px]">{row.loa_id}</td>
                                                <td className="p-4 text-[14px] text-slate-500">{row.categories}</td>
                                                <td className="p-4 text-right font-mono text-[14px]">{Number(row.old_value || 0).toFixed(2)}</td>
                                                <td className="p-4 text-right font-mono text-[14px] text-emerald-600 font-bold">{Number(row.new_value || 0).toFixed(2)}</td>
                                                <td className="p-4 text-[14px] font-bold text-slate-600">{row.month_year}</td>
                                                <td className="p-4 text-[14px]">{row.user_email}</td>
                                                <td className="p-4 text-[14px] text-slate-400 text-center">{new Date(row.created_at).toLocaleString()}</td>
                                            </>
                                        ) : activeTab === 'asbl' ? (
                                            <>
                                                <td className="p-4 font-black text-blue-700 text-[14px]">{row.loa_id}</td>
                                                <td className="p-4 text-[14px]">{row.loa_name}</td>
                                                <td className="p-4"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[14px] font-black">{row.wbs_type}</span></td>
                                                <td className="p-4 text-[14px] text-slate-500">{row.categories}</td>
                                                <td className="p-4 text-right font-mono text-[14px]">{Number(row.old_value || 0).toFixed(2)}</td>
                                                <td className="p-4 text-right font-mono text-[14px] text-blue-600 font-bold">{Number(row.new_value || 0).toFixed(2)}</td>
                                                <td className="p-4 text-[14px] font-bold text-slate-600">{row.month_year || '-'}</td>
                                                <td className="p-4 text-[14px]">{row.user_email}</td>
                                                <td className="p-4 text-[14px] text-slate-600 text-center">{new Date(row.created_at).toLocaleString()}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-4 font-black text-blue-700 text-[14px]">{row.loa_id}</td>
                                                <td className="p-4 text-[14px] truncate max-w-[200px]">{row.loa_name}</td>
                                                <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${row.action_mode === 'New Project' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>{row.action_mode}</span></td>
                                                <td className="p-4 text-center font-bold text-[14px]">{row.wbs_count}</td>
                                                <td className="p-4 text-[12px] text-slate-500 italic truncate max-w-[200px]" title={row.single_wbs}>{row.single_wbs || '-'}</td>
                                                <td className="p-4 text-xs font-bold text-slate-600">{row.user_email}</td>
                                                <td className="p-4 text-[11px] text-slate-400 text-center">{new Date(row.created_at).toLocaleString()}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODALS */}
                {showPendingLoas && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-4xl shadow-2xl animate-in zoom-in duration-200">
                        
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-black text-orange-700 uppercase tracking-tighter">
                                    Pending LOAs (Not Updated)
                                </h2>
                                {/* 🔥 NAYA: Total Count Badge */}
                                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-black border border-orange-200 shadow-sm">
                                    Total: {pendingLoas.length}
                                </span>
                            </div>
                            <button 
                                    onClick={exportPendingLoasToExcel} 
                                    className="bg-emerald-600 text-white px-4 py-1.5 rounded-xl font-bold text-xs uppercase flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95"
                                >
                                    <HiOutlineUpload /> Export List
                                </button>
                            <button onClick={() => setShowPendingLoas(false)} className="text-slate-400 hover:text-red-600 p-2 bg-slate-50 rounded-full transition-all">
                                <HiX size={28} />
                            </button>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-inner bg-white">
                            <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-orange-50 text-orange-800 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 text-xs font-black uppercase">BU</th>
                                            <th className="p-4 text-xs font-black uppercase">Customer</th>
                                            <th className="p-4 text-xs font-black uppercase">LOA ID</th>
                                            <th className="p-4 text-xs font-black uppercase">LOA Name</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pendingLoas.length > 0 ? pendingLoas.map((row, i) => (
                                            <tr key={i} className="hover:bg-orange-50/30 transition-colors">
                                                <td className="p-4 text-xs font-bold text-slate-600">{row.bu}</td>
                                                <td className="p-4 text-xs text-slate-600">{row.customer}</td>
                                                <td className="p-4 text-xs font-black text-blue-700">{row.loa_id}</td>
                                                <td className="p-4 text-xs font-bold text-slate-700">{row.loa_name}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="4" className="p-10 text-center text-slate-400 font-bold uppercase italic">
                                                    All active projects have been updated!
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-6 text-right">
                            <button 
                                onClick={() => setShowPendingLoas(false)} 
                                className="bg-slate-800 text-white px-8 py-2.5 rounded-xl font-bold text-sm uppercase hover:bg-black transition-all shadow-lg active:scale-95"
                            >
                                Done Reviewing
                            </button>
                        </div>
                    </div>
                </div>
            )}

                {showPending && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] p-8 w-full max-w-4xl shadow-2xl">
                            <div className="flex justify-between items-center mb-8 border-b pb-4">
                                <h2 className="text-3xl font-black text-red-700 uppercase tracking-tighter">Pending Users</h2>
                                <button onClick={() => setShowPending(false)} className="text-slate-400 hover:text-red-600 p-2"><HiX size={28} /></button>
                            </div>
                            <div className="flex justify-between items-center mb-6">
                                <button onClick={exportPendingUsers} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase flex items-center gap-2"><HiOutlineUpload /> Export List</button>
                                <input type="text" placeholder="Search user..." value={pendingSearch} onChange={(e) => setPendingSearch(e.target.value)} className="border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none w-64" />
                            </div>
                            <div className="overflow-auto max-h-[400px] rounded-xl border border-slate-100">
                                <table className="w-full text-left">
                                    <thead className="bg-red-50 text-red-800 sticky top-0">
                                        <tr><th className="p-4 text-[11px] font-black uppercase">Email Address</th><th className="p-4 text-[11px] font-black uppercase text-center">User Type</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 bg-white">
                                        {filteredPendingUsers.map((u, i) => (
                                            <tr key={i} className="hover:bg-red-50/30 transition-colors">
                                                <td className="p-4 text-sm font-bold text-slate-700">{u.email}</td>
                                                <td className="p-4 text-center"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase border">{u.type}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Logs;