import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
    HiOutlineRefresh, HiOutlinePlay, HiCheckCircle, HiXCircle,
    HiOutlineClock, HiOutlineInformationCircle, HiOutlineLightningBolt,
    HiCheck, HiOutlineCalendar
} from 'react-icons/hi';

const JOB_NAME_MAP = {
    full_sync: 'Full Database Sync',
    bgdm_alerts: 'PTD UTIL % & EAC vs ASBL Notification',
    monthly_project_audit: 'Last Month Added WBS List',
    db_backup: 'Database Backup',
    ptd_reminder_check: 'Reminder: Non-Committed Update',
    pending_loa_audit: 'LOA Name with no Non-Committed in current month'
};

const PRESETS = [
    { label: '3 min (Test)', value: '*/3 * * * *' },
    { label: 'Every Hour', value: '0 * * * *' },
    { label: 'Daily (8AM)', value: '0 8 * * *' },
    { label: 'Daily (12PM)', value: '0 12 * * *' },
    { label: 'Monthly (1st)', value: '0 12 1 * *' },
    { label: 'Monthly (18th)', value: '0 12 18 * *' }
];

const AdminCronPanel = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const [customInputs, setCustomInputs] = useState({});
    const [customTime, setCustomTime] = useState({});
    const [customDate, setCustomDate] = useState({});
    const [customFrequency, setCustomFrequency] = useState({});

    const fetchAllJobs = async () => {
        try {
            // Simulated fetch for demonstration if API fails, replace with actual API
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/cron/config`);
            setJobs(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAllJobs(); }, []);

    const handleUpdate = async (jobName, payload) => {
        setProcessingId(jobName);
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/cron/update`, { job_name: jobName, ...payload });
            await fetchAllJobs();
            Swal.fire({ icon: 'success', title: 'Schedule Updated', timer: 1500, showConfirmButton: false });
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Update failed', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const triggerJob = async (jobName) => {
        const friendlyName = JOB_NAME_MAP[jobName] || jobName;
        const res = await Swal.fire({
            title: 'Manual Trigger',
            text: `Run "${friendlyName}" now?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0f172a', // Sleeker dark button
            cancelButtonColor: '#cbd5e1'
        });
        if (!res.isConfirmed) return;

        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/cron/trigger`, { job_name: jobName });
            Swal.fire('Processing', 'Process started in background', 'info');
        } catch (err) {
            Swal.fire('Error', 'Failed to trigger', 'error');
        }
    };

    const generateCustomCron = (jobName) => {
        const time = customTime[jobName];
        const date = customDate[jobName];
        const frequency = customFrequency[jobName] || 'daily';

        if (!time) {
            Swal.fire('Select Time', 'Please select a time first.', 'warning');
            return;
        }

        const [hours, minutes] = time.split(':');
        let cronExpression;

        if (frequency === 'hourly') cronExpression = `${minutes} * * * *`;
        else if (frequency === 'monthly') {
            const day = date ? new Date(`${date}T00:00:00`).getDate() : 1;
            cronExpression = `${minutes} ${hours} ${day} * *`;
        } else {
            cronExpression = `${minutes} ${hours} * * *`;
        }

        handleUpdate(jobName, { cron_expression: cronExpression });
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <HiOutlineRefresh className="animate-spin" size={32} />
                    <span className="text-sm font-medium tracking-wide uppercase">Loading Control Center...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 pb-20">
            {/* Header Section */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 relative">
                    <div className="bg-slate-900 p-2.5 rounded-xl text-white">
                        <HiOutlineLightningBolt size={22} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Cron Control Panel</h2>
                    <div 
                        className="cursor-help text-slate-400 hover:text-slate-700 transition-colors ml-1 relative" 
                        onMouseEnter={() => setShowTooltip(true)} 
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <HiOutlineInformationCircle size={20} />
                        {showTooltip && (
                            <div className="absolute top-8 left-0 z-50 w-80 bg-white p-5 rounded-xl shadow-xl border border-slate-200 text-sm">
                                <p className="font-semibold text-xs text-slate-500 uppercase tracking-wider mb-3">DB vs UI Names</p>
                                <div className="space-y-3">
                                    {Object.entries(JOB_NAME_MAP).map(([tech, friendly]) => (
                                        <div key={tech} className="flex flex-col">
                                            <span className="font-medium text-slate-800">{friendly}</span>
                                            <span className="text-slate-400 font-mono text-[10px] mt-0.5">{tech}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <button 
                    onClick={fetchAllJobs} 
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm text-sm font-medium"
                >
                    <HiOutlineRefresh size={16} /> Refresh Status
                </button>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {jobs.map((job) => (
                    <div 
                        key={job.id} 
                        className={`bg-white rounded-2xl border border-slate-200 p-6 md:p-8 transition-all shadow-sm hover:shadow-md ${!job.is_enabled && 'bg-slate-50/50 grayscale-[0.2]'}`}
                    >
                        {/* Card Header & Toggle */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="pr-4">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">
                                    {JOB_NAME_MAP[job.job_name] || job.job_name}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {job.is_enabled ? (
                                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 uppercase tracking-wide flex items-center gap-1">
                                            <HiCheckCircle size={14} /> Active
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 uppercase tracking-wide flex items-center gap-1">
                                            <HiXCircle size={14} /> Paused
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Modern Toggle Switch */}
                            <button 
                                onClick={() => handleUpdate(job.job_name, { is_enabled: !job.is_enabled })} 
                                disabled={processingId === job.job_name} 
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 ${job.is_enabled ? 'bg-slate-900' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${job.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* Special Note for Full Sync */}
                        {job.job_name === 'full_sync' && (
                            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <HiOutlineLightningBolt size={14} /> Auto-Triggers Included
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {['New WBS Entries', 'ASBL Data Uploads', 'Admin Non-Committed Updates'].map(item => (
                                        <span key={item} className="text-[11px] font-medium text-slate-600 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Terminal / Cron Expression Block */}
                        <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between mb-6 shadow-inner">
                            <div className="flex items-center gap-3">
                                <HiOutlineClock className="text-slate-400" size={20} />
                                <span className="text-lg font-mono text-emerald-400 tracking-widest">
                                    {job.cron_expression}
                                </span>
                            </div>
                            <span className="hidden sm:block text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                                Active Schedule
                            </span>
                        </div>

                        {/* Configuration Tabs / Sections */}
                        <div className="space-y-6">
                            {/* Presets */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 mb-3">Quick Presets</p>
                                <div className="flex flex-wrap gap-2">
                                    {PRESETS.map(p => (
                                        <button 
                                            key={p.value} 
                                            disabled={processingId === job.job_name} 
                                            onClick={() => handleUpdate(job.job_name, { cron_expression: p.value })} 
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40 border ${
                                                job.cron_expression === p.value 
                                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Setup Layout (Grid) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Visual Builder */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <p className="text-xs font-semibold text-slate-500 mb-3">Custom Time</p>
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input 
                                                type="time" 
                                                value={customTime[job.job_name] || ''} 
                                                onChange={e => setCustomTime({ ...customTime, [job.job_name]: e.target.value })} 
                                                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-shadow" 
                                            />
                                            <select 
                                                value={customFrequency[job.job_name] || 'daily'} 
                                                onChange={e => setCustomFrequency({ ...customFrequency, [job.job_name]: e.target.value })} 
                                                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-shadow cursor-pointer"
                                            >
                                                <option value="hourly">Hourly</option>
                                                <option value="daily">Daily</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                        </div>
                                        {customFrequency[job.job_name] === 'monthly' && (
                                            <input 
                                                type="date" 
                                                value={customDate[job.job_name] || ''} 
                                                onChange={e => setCustomDate({ ...customDate, [job.job_name]: e.target.value })} 
                                                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-shadow" 
                                            />
                                        )}
                                        <button 
                                            onClick={() => generateCustomCron(job.job_name)} 
                                            disabled={!customTime[job.job_name] || processingId === job.job_name} 
                                            className="w-full bg-slate-800 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-700 transition-colors disabled:opacity-50"
                                        >
                                            <HiCheck size={14} /> Set Time
                                        </button>
                                    </div>
                                </div>

                                {/* Raw Input */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col">
                                    <p className="text-xs font-semibold text-slate-500 mb-3">Raw Cron Expression</p>
                                    <div className="flex flex-col h-full justify-between gap-3">
                                        <input 
                                            type="text" 
                                            value={customInputs[job.job_name] || ''} 
                                            onChange={e => setCustomInputs({ ...customInputs, [job.job_name]: e.target.value })} 
                                            placeholder="e.g. 0 10 * * *" 
                                            className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-mono outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-shadow" 
                                        />
                                        <button 
                                            onClick={() => handleUpdate(job.job_name, { cron_expression: customInputs[job.job_name] })} 
                                            disabled={!customInputs[job.job_name] || processingId === job.job_name} 
                                            className="w-full bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-colors disabled:opacity-50"
                                        >
                                            <HiCheck size={14} /> Apply Raw Cron
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Footer / Execution Line */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 mt-2 border-t border-slate-100">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Executed</p>
                                    <p className="text-sm font-medium text-slate-700">
                                        {job.last_run_at ? new Date(job.last_run_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never Run'}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => triggerJob(job.job_name)} 
                                    className="bg-white border border-slate-200 text-slate-700 px-5 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
                                >
                                    <HiOutlinePlay size={16} className="text-slate-500" /> Run Job Now
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminCronPanel;