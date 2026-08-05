import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import boatImage from '../assets/boat.jpg';
import AccessRequestsTable from './AccessRequestsTable';

const RequestAccess = ({ onBack }) => {
    const [formData, setFormData] = useState({
        accountName: '',
        bu: '',
        projectName: '',
        email: ''
    });

    const [dropdowns, setDropdowns] = useState({
        customers: [],
        bus: [],
        loas: []
    });

    const [loading, setLoading] = useState(false);
    const [viewRequests, setViewRequests] = useState(false);

    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/dropdowns`);
                setDropdowns(res.data);
            } catch (err) {
                console.error("Failed to load dropdown data", err);
            }
        };
        fetchDropdowns();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            alert("Access request sent successfully!");
            setLoading(false);
            onBack();
        }, 1500);
    };

    if (viewRequests) {
        return <AccessRequestsTable onBack={() => setViewRequests(false)} />;
    }

    // --- SEARCHABLE DROPDOWN COMPONENT ---
    const SearchableSelect = ({ label, name, value, options, required = false, placeholder }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [searchTerm, setSearchTerm] = useState('');
        const wrapperRef = useRef(null);

        // Click outside to close dropdown
        useEffect(() => {
            function handleClickOutside(event) {
                if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                    setIsOpen(false);
                }
            }
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [wrapperRef]);

        // Filter options based on search
        const filteredOptions = options.filter(option =>
            option.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="relative" ref={wrapperRef}>
                <label className="text-[13px] font-bold text-slate-900 uppercase tracking-wider ml-1">
                    {label} {required && '*'}
                </label>
                
                {/* Custom Trigger / Search Input */}
                <div 
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full mt-1.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm flex justify-between items-center cursor-pointer hover:border-blue-400 transition-all"
                >
                    <span className={value ? "text-slate-800" : "text-slate-400"}>
                        {value || placeholder}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Search Box inside dropdown */}
                        <div className="p-3 border-b border-slate-100 bg-slate-50">
                            <input
                                type="text"
                                autoFocus
                                placeholder="Type to search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                        
                        {/* Options List */}
                        <div className="max-h-56 overflow-y-auto custom-scrollbar">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setFormData({ ...formData, [name]: opt });
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className="px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                                    >
                                        {opt}
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-sm text-slate-400 text-center">No results found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-end font-['Calibri',_sans-serif] overflow-hidden"
            style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.1), rgba(0,0,0,0.5)), url(${boatImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            
            <div className="w-full sm:w-[85%] md:w-[50%] lg:w-[40%] xl:w-[35%] h-screen bg-white/95 backdrop-blur-md shadow-[-10px_0_30px_rgba(0,0,0,0.2)] flex flex-col justify-center px-8 md:px-16 relative">
                
                <button onClick={onBack} className="absolute top-8 left-8 flex items-center text-slate-700 hover:text-blue-600 transition-all font-bold text-sm group">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 group-hover:-translate-x-1 transition-transform">
                        <path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back to Login
                </button>

                <div className="max-w-md w-full mx-auto pt-10">
                    <div className="mb-8">
                        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Request Access</h1>
                        <p className="text-slate-600 text-[16px] leading-relaxed">Fill the below form to request access.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        <SearchableSelect 
                            label="Customer Account Name" 
                            name="accountName" 
                            value={formData.accountName} 
                            options={dropdowns.customers} 
                            required 
                            placeholder="Select Customer Account▼" 
                        />

                        <SearchableSelect 
                            label="BU (Business Unit)" 
                            name="bu" 
                            value={formData.bu} 
                            options={dropdowns.bus} 
                            placeholder="Select BU▼" 
                        />

                        <SearchableSelect 
                            label="Project / LOA Name" 
                            name="projectName" 
                            value={formData.projectName} 
                            options={dropdowns.loas} 
                            placeholder="Select Project / LOA▼" 
                        />

                        <div>
                            <label className="text-[13px] font-bold text-slate-900 uppercase tracking-wider ml-1">Email Address *</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="w-full mt-1.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="name@nokia.com"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-4 py-4 bg-[#005AFF] hover:bg-blue-700 text-white rounded-2xl font-bold text-[15px] shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? "Processing..." : "Submit Access Request"}
                        </button>

                        <div className="mt-4 flex justify-center">
                            <button type="button" onClick={() => setViewRequests(true)} className="text-[14px] font-bold text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-2 uppercase tracking-widest">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                View All Requests (Admin Only)
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RequestAccess;