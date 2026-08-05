import React from 'react';

const AccessRequestsTable = ({ onBack }) => {
    // Mock Data updated to remove customerName
    const requests = [
        { id: 1, accountName: "Finance Ops", bu: "NI", projectName: "Project X", email: "user1@nokia.com", status: "Pending" },
        { id: 2, accountName: "Network Planning", bu: "CNS", projectName: "LOA 2024", email: "user2@nokia.com", status: "Pending" },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-['Calibri',_sans-serif]">
            <div className="max-w-7xl mx-auto">
                
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <button 
                            onClick={onBack}
                            className="flex items-center text-slate-700 hover:text-blue-600 transition-all font-bold text-sm mb-2 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 group-hover:-translate-x-1 transition-transform">
                                <path d="M19 12H5M12 19l-7-7 7-7"/>
                            </svg>
                            Back to Request Form
                        </button>
                        <h1 className="text-3xl font-black text-slate-800">Access Requests Management</h1>
                        <p className="text-slate-500 text-sm">Review and manage tool access requests.</p>
                    </div>
                    
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold border border-blue-100">
                        Total Pending: {requests.length}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider">Customer Account Name</th>
                                    <th className="p-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider">BU</th>
                                    <th className="p-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider">Project/LOA</th>
                                    <th className="p-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                                    <th className="p-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-sm text-slate-700 font-medium">{req.accountName}</td>
                                        <td className="p-4 text-sm text-slate-600">{req.bu || '-'}</td>
                                        <td className="p-4 text-sm text-slate-700">{req.projectName}</td>
                                        <td className="p-4 text-sm text-blue-600 font-medium">{req.email}</td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => alert(`Approved: ${req.email}`)}
                                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-emerald-100"
                                                >
                                                    Approve
                                                </button>
                                                <button 
                                                    onClick={() => alert(`Declined: ${req.email}`)}
                                                    className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-rose-100"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccessRequestsTable;