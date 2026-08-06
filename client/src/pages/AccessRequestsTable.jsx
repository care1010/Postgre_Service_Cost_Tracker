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
                        <button onClick={onBack} className="text-blue-600 font-bold text-sm mb-2 hover:underline">&larr; Back to Login</button>
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
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-800">{req.email}</td>
                                    <td className="p-4 text-xs text-slate-600 max-w-xs truncate" title={req.requested_customers.split('|||').join(', ')}>
                                        {req.requested_customers.split('|||').join(', ')}
                                    </td>
                                    <td className="p-4 text-xs text-slate-600">{req.bu || '-'} / {req.project_name || '-'}</td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button onClick={() => handleAction(req.id, 'approve')} className="px-3 py-1.5 bg-green-100 text-green-700 font-bold rounded-lg hover:bg-green-200">Approve</button>
                                        <button onClick={() => handleAction(req.id, 'decline')} className="px-3 py-1.5 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200">Decline</button>
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