import React, { useState, useEffect } from 'react';
import axios from 'axios';
import boatImage from '../assets/boat.jpg';
import AccessRequestsTable from './AccessRequestsTable';
import Swal from 'sweetalert2';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi'; // 🔥 Eye icons imported

const RequestAccess = ({ onBack }) => {
    const [formData, setFormData] = useState({
        customers: [], bu: '', projectName: '', email: '', password: ''
    });

    const [dropdowns, setDropdowns] = useState({ customers: [], bus: [], loas: [] });
    const [loading, setLoading] = useState(false);
    const [viewRequests, setViewRequests] = useState(false);
    const [custOpen, setCustOpen] = useState(false);
    
    // 🔥 State for Hide/Unhide Password
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/access/dropdowns`);
                setDropdowns(res.data);
            } catch (err) { console.error("Failed to load dropdowns", err); }
        };
        fetchDropdowns();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.customers.length === 0) return Swal.fire("Error", "Please select at least one customer", "error");

        setLoading(true);
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/data/access/request`, formData);
            Swal.fire("Success", "Access request sent successfully! Awaiting Admin approval.", "success");
            onBack();
        } catch (err) {
            Swal.fire("Error", err.response?.data?.error || "Request failed", "error");
        } finally {
            setLoading(false);
        }
    };

    if (viewRequests) return <AccessRequestsTable onBack={() => setViewRequests(false)} />;

    return (
        <div className="min-h-screen w-full flex items-center justify-end font-['Calibri',_sans-serif] overflow-hidden"
            style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.1), rgba(0,0,0,0.5)), url(${boatImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            
            <div className="w-full sm:w-[85%] md:w-[50%] lg:w-[40%] xl:w-[35%] h-screen bg-white/95 backdrop-blur-md shadow-[-10px_0_30px_rgba(0,0,0,0.2)] flex flex-col justify-center px-8 md:px-16 relative overflow-y-auto">
                
                <button onClick={onBack} className="absolute top-8 left-8 flex items-center text-slate-700 hover:text-blue-600 font-bold text-sm">
                    &larr; Back to Login
                </button>

                <div className="max-w-md w-full mx-auto pt-10">
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Request Access</h1>
                    <p className="text-slate-600 text-[16px] mb-8">Fill the below form to request access.</p>

                    {/* 🔥 Fixed: Added autoComplete="off" to form */}
                    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                        
                        <div className="relative">
                            <label className="text-[12px] font-bold text-slate-900 uppercase tracking-wider ml-1">Customers *</label>
                            <div onClick={() => setCustOpen(!custOpen)} className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm cursor-pointer hover:border-blue-400">
                                {formData.customers.length > 0 ? formData.customers.join(', ') : "Select Customers ▼"}
                            </div>
                            {custOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto p-2">
                                    {dropdowns.customers.map(c => (
                                        <label key={c} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer">
                                            <input type="checkbox" checked={formData.customers.includes(c)} onChange={() => {
                                                const next = formData.customers.includes(c) ? formData.customers.filter(x => x !== c) : [...formData.customers, c];
                                                setFormData({ ...formData, customers: next });
                                            }} />
                                            <span className="text-sm">{c}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-[12px] font-bold text-slate-900 uppercase tracking-wider ml-1">BU</label>
                            <select className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm" value={formData.bu} onChange={e => setFormData({...formData, bu: e.target.value})}>
                                <option value="">Select BU</option>
                                {dropdowns.bus.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[12px] font-bold text-slate-900 uppercase tracking-wider ml-1">Project/LOA</label>
                            <select className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm" value={formData.projectName} onChange={e => setFormData({...formData, projectName: e.target.value})}>
                                <option value="">Select LOA</option>
                                {dropdowns.loas.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[12px] font-bold text-slate-900 uppercase tracking-wider ml-1">Email Address *</label>
                            {/* 🔥 Fixed: Added autoComplete="new-password" to trick browser into NOT autofilling */}
                            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} autoComplete="new-password" placeholder="name@nokia.com" 
                                className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm" />
                        </div>

                        <div className="relative">
                            <label className="text-[12px] font-bold text-slate-900 uppercase tracking-wider ml-1">Choose a Password *</label>
                            <div className="relative flex items-center">
                                {/* 🔥 Fixed: Added showPassword toggle logic and autoComplete="new-password" */}
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required 
                                    value={formData.password} 
                                    onChange={e => setFormData({...formData, password: e.target.value})} 
                                    autoComplete="new-password" 
                                    placeholder="••••••••" 
                                    className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm pr-10" 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-[55%] transform -translate-y-1/2 text-slate-400 hover:text-blue-600 focus:outline-none"
                                >
                                    {showPassword ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md mt-4">
                            {loading ? "Processing..." : "Submit Access Request"}
                        </button>

                        <div className="mt-2 text-center">
                            <button type="button" onClick={() => setViewRequests(true)} className="text-xs font-bold text-slate-500 hover:text-blue-600 underline">
                                Admin: View Pending Requests
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RequestAccess;