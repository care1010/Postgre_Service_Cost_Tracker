import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { HiOutlineRefresh, HiOutlineUpload, HiOutlineUsers, HiSearch, HiX } from 'react-icons/hi';

const Logs = () => {
    const [activeTab, setActiveTab] = useState('non-committed'); 
    const [logs, setLogs] = useState([]);
    const [asblLogs, setAsblLogs] = useState([]);
    const [projectLogs, setProjectLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showPending, setShowPending] = useState(false);
    const [pendingUsers, setPendingUsers] = useState([]);

    const [logSearch, setLogSearch] = useState('');
    const [pendingSearch, setPendingSearch] = useState('');

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
        } catch (err) {
            console.error(err);
        }
    };

    // Data Filtering
    const currentData = activeTab === 'non-committed' ? logs : (activeTab === 'asbl' ? asblLogs : projectLogs);
    const filteredLogs = currentData.filter((row) =>
        Object.values(row).some((value) =>
            String(value ?? "").toLowerCase().includes(logSearch.toLowerCase())
        )
    );

    const filteredPendingUsers = pendingUsers.filter((user) =>
        `${user.email} ${user.type}`.toLowerCase().includes(pendingSearch.toLowerCase())
    );

    // Export Logic for Main Logs
    const exportLogsToExcel = () => {
        let exportData = filteredLogs.map(row => {
            if (activeTab === 'non-committed') {
                return { User: row.user_email, BU: row.bu, Customer: row.customer, LOA: row.loa_name, LOA_ID: row.loa_id, Category: row.categories, Old_Value: row.old_value, New_Value: row.new_value, Month: row.month_year, Time: new Date(row.created_at).toLocaleString() };
            } else if (activeTab === 'asbl') {
                return { User: row.user_email, LOA_ID: row.loa_id, LOA_Name: row.loa_name, WBS_Type: row.wbs_type, Category: row.categories, Old_ASBL: row.old_value, New_ASBL: row.new_value, Month: row.month_year, Time: new Date(row.created_at).toLocaleString() };
            } else {
                return { User: row.user_email, LOA_ID: row.loa_id, LOA_Name: row.loa_name, Action: row.action_mode, WBS_Count: row.wbs_count, Month: row.month_year, Time: new Date(row.created_at).toLocaleString() };
            }
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Logs');
        XLSX.writeFile(wb, `${activeTab}_Logs.xlsx`);
    };

    // 🔥 NAYA: Export Logic for Pending Users
    const exportPendingUsers = () => {
        const exportData = filteredPendingUsers.map(user => ({ Email: user.email, Role: user.type }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pending_Users');
        XLSX.writeFile(wb, `Pending_Submissions_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="p-6 font-['Calibri']">
            <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100">
                
                {/* HEADER SECTION */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Logs</h1>
                    <div className="flex gap-3">
                        <div className="relative">
                            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} className="pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64" />
                        </div>
                        <button onClick={exportLogsToExcel} className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-md hover:bg-emerald-700 transition-all"><HiOutlineUpload /> Export Logs</button>
                        <button onClick={fetchPendingUsers} className="bg-red-600 text-white px-5 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-md hover:bg-red-700 transition-all"><HiOutlineUsers /> Pending Users</button>
                        <button onClick={fetchAllLogs} className="bg-slate-100 p-2 rounded-xl hover:bg-slate-200"><HiOutlineRefresh className={loading ? "animate-spin" : ""} /></button>
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

                {/* MAIN TABLE */}
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/20 shadow-inner">
                    <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
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
                                            <th className="p-4 text-[13px] uppercase text-right">Old Non Committed</th>
                                            <th className="p-4 text-[13px] uppercase text-right text-emerald-300">New Non Committed</th>
                                            <th className="p-4 text-[13px] uppercase">Month</th>
                                            <th className="p-4 text-[13px] uppercase">User</th>
                                            <th className="p-4 text-[13px] uppercase">Updated At</th>
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
                                            <th className="p-4 text-[13px] uppercase">Updated At</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="p-4 text-[13px] uppercase text-blue-300">LOA ID</th>
                                            <th className="p-4 text-[13px] uppercase">LOA Name</th>
                                            <th className="p-4 text-[13px] uppercase">Action of WBS</th>
                                            <th className="p-4 text-[13px] uppercase text-center">Total WBS Added</th>
                                            <th className="p-4 text-[13px] uppercase text-center">Month</th>
                                            <th className="p-4 text-[13px] uppercase">User</th>
                                            <th className="p-4 text-[13px] uppercase text-center">Updated At</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y">
                                {loading ? (
                                    <tr><td colSpan="10" className="p-10 text-center font-bold text-slate-400">Loading records...</td></tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr><td colSpan="10" className="p-10 text-center text-slate-300">No logs found.</td></tr>
                                ) : filteredLogs.map((row) => (
                                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                                        {activeTab === 'non-committed' && (
                                            <>
                                                <td className="p-4 font-bold text-[14px]">{row.bu}</td>
                                                <td className="p-4 text-[14px] truncate max-w-[200px]">{row.customer}</td>
                                                <td className="p-4 text-[14px] truncate max-w-[200px]">{row.loa_name}</td>
                                                <td className="p-4 font-black text-blue-700 text-[14px]">{row.loa_id}</td>
                                                <td className="p-4 text-[14px] text-slate-500">{row.categories}</td>
                                                <td className="p-4 text-right font-mono text-[14px]">{Number(row.old_value || 0).toFixed(2)}</td>
                                                <td className="p-4 text-right font-mono text-[14px] text-emerald-600 font-bold">{Number(row.new_value || 0).toFixed(2)}</td>
                                                <td className="p-4 text-[14px] font-bold text-slate-600">{row.month_year}</td>
                                                <td className="p-4 text-[14px]">{row.user_email}</td>
                                                <td className="p-4 text-[14px] text-slate-600">{new Date(row.created_at).toLocaleString()}</td>
                                            </>
                                        )}
                                        {activeTab === 'asbl' && (
                                            <>
                                                <td className="p-4 font-black text-blue-700 text-[14px]">{row.loa_id}</td>
                                                <td className="p-4 text-[14px]">{row.loa_name}</td>
                                                <td className="p-4"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[14px] font-black">{row.wbs_type}</span></td>
                                                <td className="p-4 text-[14px] text-slate-500">{row.categories}</td>
                                                <td className="p-4 text-right font-mono text-[14px]">{Number(row.old_value || 0).toFixed(2)}</td>
                                                <td className="p-4 text-right font-mono text-[14px] text-blue-600 font-bold">{Number(row.new_value || 0).toFixed(2)}</td>
                                                <td className="p-4 text-[14px] font-bold text-slate-600">{row.month_year || '-'}</td>
                                                <td className="p-4 text-[14px]">{row.user_email}</td>
                                                <td className="p-4 text-[14px] text-slate-600">{new Date(row.created_at).toLocaleString()}</td>
                                            </>
                                        )}
                                        {activeTab === 'add-project' && (
                                            <>
                                                <td className="p-4 font-black text-blue-700 text-[14px]">{row.loa_id}</td>
                                                <td className="p-4 text-[14px]">{row.loa_name}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded text-[14px] font-black ${row.action_mode === 'New Project' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        {row.action_mode}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center font-bold text-[14px]">{row.wbs_count}</td>
                                                <td className="p-4 text-[14px] font-bold text-slate-600 text-center">{row.month_year || '-'}</td>
                                                <td className="p-4 text-[14px]">{row.user_email}</td>
                                                <td className="p-4 text-[14px] text-slate-600 text-center">{new Date(row.created_at).toLocaleString()}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ─── PENDING USERS MODAL (Now with Export and Search) ─── */}
                {showPending && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-4xl shadow-2xl animate-in zoom-in duration-200">
                            
                            <div className="flex justify-between items-center mb-8 border-b pb-4">
                                <div>
                                    <h2 className="text-3xl font-black text-red-700 uppercase tracking-tighter">Pending Users</h2>
                                    <p className="text-slate-400 text-xs font-bold mt-1 uppercase">Users who haven't updated values this month</p>
                                </div>
                                <button onClick={() => setShowPending(false)} className="text-slate-400 hover:text-red-600 p-2 bg-slate-50 rounded-full transition-all"><HiX size={28} /></button>
                            </div>

                            <div className="flex justify-between items-center mb-6">
                                {/* 🔥 RE-ADDED EXPORT BUTTON INSIDE MODAL */}
                                <button onClick={exportPendingUsers} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-lg transition-all">
                                    <HiOutlineUpload className="text-lg" /> Export List
                                </button>

                                <div className="relative">
                                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search user email..." 
                                        value={pendingSearch} 
                                        onChange={(e) => setPendingSearch(e.target.value)} 
                                        className="pl-10 pr-4 py-2.5 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-red-400 w-64 transition-all" 
                                    />
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-slate-100">
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left">
                                        <thead className="bg-red-50 text-red-800 sticky top-0">
                                            <tr>
                                                <th className="p-4 text-[11px] font-black uppercase">Email Address</th>
                                                <th className="p-4 text-[11px] font-black uppercase text-center">User Type</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredPendingUsers.length === 0 ? (
                                                <tr><td colSpan="2" className="p-10 text-center font-bold text-slate-300">NO PENDING USERS</td></tr>
                                            ) : filteredPendingUsers.map((u, i) => (
                                                <tr key={i} className="hover:bg-red-50/30 transition-colors">
                                                    <td className="p-4 text-sm font-bold text-slate-700">{u.email}</td>
                                                    <td className="p-4 text-center">
                                                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase border">{u.type}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Logs;