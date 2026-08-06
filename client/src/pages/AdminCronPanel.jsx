import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { HiOutlineRefresh } from 'react-icons/hi';

const PRESETS = [
    { label: '3x Daily (8am, 2pm, 8pm IST)', value: '0 8,14,20 * * *' },
    { label: '2x Daily (9am, 6pm IST)',       value: '0 9,18 * * *' },
    { label: 'Every 4 Hours',                  value: '0 */4 * * *' },
    { label: 'Every 6 Hours',                  value: '0 */6 * * *' },
    { label: 'Once Daily (Midnight)',           value: '0 0 * * *' },
    { label: 'Every Hour',                     value: '0 * * * *' },
    { label: 'Custom',                         value: 'custom' },
];

const AdminCronPanel = ({ user }) => {
    const [config, setConfig] = useState(null);
    const [status, setStatus] = useState({ isRunning: false, cronActive: false });
    const [loading, setLoading] = useState(true);
    const [selectedPreset, setSelectedPreset] = useState('');
    const [customCron, setCustomCron] = useState('');
    const [saving, setSaving] = useState(false);
    const pollRef = useRef(null);

    const fetchConfig = async () => {
        try {
            const [configRes, statusRes] = await Promise.all([
                axios.get(`${process.env.REACT_APP_API_URL}/api/cron/config`),
                axios.get(`${process.env.REACT_APP_API_URL}/api/cron/status`)
            ]);
            setConfig(configRes.data);
            setStatus(statusRes.data);

            const matchedPreset = PRESETS.find(p => p.value === configRes.data.cron_expression);
            setSelectedPreset(matchedPreset ? matchedPreset.value : 'custom');
            if (!matchedPreset) setCustomCron(configRes.data.cron_expression || '');
        } catch (err) {
            console.error('Cron config fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
        pollRef.current = setInterval(async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/cron/status`);
                setStatus(res.data);
            } catch {}
        }, 5000);
        return () => clearInterval(pollRef.current);
    }, []);

    const handleSave = async () => {
        const expression = selectedPreset === 'custom' ? customCron : selectedPreset;
        if (!expression) return Swal.fire('Error', 'Please select or enter a cron schedule.', 'error');

        setSaving(true);
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/cron/update`, {
                cron_expression: expression,
                is_enabled: config?.is_enabled ?? true
            });
            setConfig(res.data.config);
            Swal.fire({ icon: 'success', title: 'Schedule Updated!', text: res.data.message, timer: 2000, showConfirmButton: false });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to update schedule', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleEnable = async () => {
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/cron/update`, {
                is_enabled: !config?.is_enabled
            });
            setConfig(res.data.config);
            Swal.fire({
                icon: res.data.config.is_enabled ? 'success' : 'warning',
                title: res.data.config.is_enabled ? 'Cron Enabled!' : 'Cron Disabled!',
                timer: 1500, showConfirmButton: false
            });
        } catch (err) {
            Swal.fire('Error', 'Failed to toggle cron', 'error');
        }
    };

    const handleManualSync = async () => {
        const result = await Swal.fire({
            title: 'Run Manual Sync?',
            text: 'This will trigger a full database sync immediately.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Sync Now',
            confirmButtonColor: '#2563eb'
        });
        if (!result.isConfirmed) return;

        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/cron/trigger`, { triggeredBy: 'manual_admin' });
            Swal.fire({ icon: 'info', title: 'Sync Started!', text: 'Running in background. Status will update in a moment.', timer: 3000, showConfirmButton: false });
            setTimeout(fetchConfig, 3000);
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to trigger sync', 'error');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleString('en-IN', { 
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const statusColor = config?.last_run_status === 'success' ? 'text-green-600' :
                        config?.last_run_status === 'error' ? 'text-red-600' : 'text-slate-400';

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">⚙️ Auto-Sync Scheduler</h2>

            {/* ─── STATUS CARD ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-4">Current Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Cron Active</div>
                        <div className={`text-lg font-black ${status.cronActive ? 'text-green-600' : 'text-slate-400'}`}>
                            {status.cronActive ? '🟢 ON' : '🔴 OFF'}
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Sync Running</div>
                        <div className={`text-lg font-black ${status.isRunning ? 'text-orange-500' : 'text-slate-400'}`}>
                            {status.isRunning ? '⏳ YES' : '✅ IDLE'}
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Total Runs</div>
                        <div className="text-lg font-black text-blue-600">{config?.run_count || 0}</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Last Status</div>
                        <div className={`text-sm font-black uppercase ${statusColor}`}>
                            {config?.last_run_status || 'Never'}
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Last Run</div>
                    <div className="text-sm font-semibold text-slate-700">{formatDate(config?.last_run_at)}</div>
                    {config?.last_run_message && (
                        <div className="text-xs text-slate-500 mt-1 truncate">{config.last_run_message}</div>
                    )}
                </div>
            </div>

            {/* ─── SCHEDULE CONFIG ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider">Schedule Configuration</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">
                            {config?.is_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                            onClick={handleToggleEnable}
                            className={`relative w-12 h-6 rounded-full transition-colors ${config?.is_enabled ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config?.is_enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Quick Presets</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {PRESETS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => { setSelectedPreset(p.value); if (p.value !== 'custom') setCustomCron(''); }}
                                    className={`text-left px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                                        ${selectedPreset === p.value
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {p.label}
                                    {p.value !== 'custom' && (
                                        <span className="ml-2 text-xs text-slate-400 font-mono">{p.value}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedPreset === 'custom' && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                                Custom Cron Expression
                            </label>
                            <input
                                type="text"
                                value={customCron}
                                onChange={e => setCustomCron(e.target.value)}
                                placeholder="e.g. 0 9,15,21 * * *"
                                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl font-mono text-sm focus:border-blue-500 outline-none"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Format: minute hour day month weekday — <a href="https://crontab.guru" target="_blank" rel="noreferrer" className="text-blue-500 underline">crontab.guru</a> se verify karo
                            </p>
                        </div>
                    )}

                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                        <span className="text-xs font-bold text-blue-600 uppercase">Active Schedule: </span>
                        <span className="text-sm font-mono font-bold text-blue-800">
                            {config?.cron_expression || 'Not set'} (IST)
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase shadow hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                    {saving ? 'Saving...' : '💾 Save Schedule'}
                </button>
            </div>

            {/* ─── MANUAL TRIGGER ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-4">Manual Control</h3>
                <button
                    onClick={handleManualSync}
                    disabled={status.isRunning}
                    className={`w-full py-4 rounded-xl font-black text-sm uppercase shadow transition-all flex items-center justify-center gap-2
                        ${status.isRunning
                            ? 'bg-orange-100 text-orange-600 cursor-not-allowed'
                            : 'bg-slate-800 text-white hover:bg-black'
                        }`}
                >
                    <HiOutlineRefresh className={`text-lg ${status.isRunning ? 'animate-spin' : ''}`} />
                    {status.isRunning ? 'Sync In Progress...' : 'Run Manual Sync Now'}
                </button>
            </div>

            {/* ─── AUTO-TRIGGER INFO ─── */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <h3 className="text-sm font-black text-amber-800 uppercase mb-3">🔔 Auto-Trigger Events</h3>
                <div className="space-y-2 text-sm text-amber-700">
                    {[
                        'Add New Project (new LOA)',
                        'Add WBS to existing LOA',
                        'Upload ASBL data',
                        'Upload PTD data (CJ74/CJI5)',
                        'Save Non-Committed changes by Admin/SuperAdmin',
                    ].map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-xs font-black">{i + 1}</span>
                            {t}
                        </div>
                    ))}
                </div>
                <p className="text-xs text-amber-600 mt-3">
                    ⚡ These events automatically trigger a sync 2 seconds after the action completes.
                </p>
            </div>
        </div>
    );
};

// 🔥 EXACTLY YEH LINE MISS THI TUMHARE CODE MEIN
export default AdminCronPanel;