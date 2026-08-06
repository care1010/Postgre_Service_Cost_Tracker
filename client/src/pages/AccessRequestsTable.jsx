import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

const AccessRequestsTable = ({ onBack }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/access/pending`);
            setRequests(res.data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { fetchRequests(); }, []);

    const handleAction = async (id, action) => {
        try {
            const endpoint = action === 'approve' ? 'approve' : 'decline';
            await axios.post(`${process.env.REACT_APP_API_URL}/api/data/access/${endpoint}`, { id });
            Swal.fire("Success", `Request ${action}d successfully`, "success");
            fetchRequests(); // Refresh table
        } catch (err) { Swal.fire("Error", "Failed to process request", "error"); }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
            <div className="max-w-7xl mx-auto">
                
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <button 
                        onClick={onBack} 
                        className="text-blue-600 font-bold text-sm mb-2 flex items-center gap-1 hover:underline"
                    >
                        &larr; Back to Dashboard
                    </button>
                        <h1 className="text-3xl font-black text-slate-800">Pending Access Requests</h1>
                    </div>
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold border border-blue-200">
                        Total Pending: {requests.length}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Email Address</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Requested Customers</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">BU / LOA</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
    {loading ? <tr><td colSpan="4" className="text-center p-4">Loading...</td></tr> : 
     requests.length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-slate-500">No pending requests.</td></tr> :
     requests.map((req) => (
        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
            <td className="p-4">
                <div className="font-bold text-slate-800">{req.email}</div>
                <div className="text-[10px] text-slate-400 italic">Requested on {new Date(req.created_at).toLocaleDateString()}</div>
            </td>
            <td className="p-4">
                {/* 🔥 Ab ye ek single customer hi hoga */}
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                    {req.requested_customers}
                </span>
            </td>
            <td className="p-4">
                <div className="text-xs font-semibold text-slate-600 truncate max-w-[200px]">
                    <span className="text-slate-400 uppercase mr-1">BU:</span> {req.bu || '-'}
                </div>
                <div className="text-xs font-semibold text-slate-600 truncate max-w-[200px]">
                    <span className="text-slate-400 uppercase mr-1">LOA:</span> {req.project_name || '-'}
                </div>
            </td>
            <td className="p-4 flex justify-center gap-2">
                <button 
                    onClick={() => handleAction(req.id, 'approve')} 
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all active:scale-95"
                >
                    Approve
                </button>
                <button 
                    onClick={() => handleAction(req.id, 'decline')} 
                    className="px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-xl hover:bg-red-50 transition-all active:scale-95"
                >
                    Decline
                </button>
            </td>
        </tr>
    ))}
</tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AccessRequestsTable;