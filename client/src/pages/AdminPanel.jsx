import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import Swal from 'sweetalert2';
import './AdminPanel.css';
import AdminCronPanel from './AdminCronPanel';
import { HiOutlineUserAdd, HiOutlineShieldCheck } from "react-icons/hi";

const AdminPanel = ({ user, onBack }) => {
    const [users, setUsers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({ id: '', email: '', password: '', type: 'user', customers: [] });
    const [activeAdminTab, setActiveAdminTab] = useState('users');
    
    const tableRef = useRef(null);

    // 1. Fetch data on load
    useEffect(() => {
        fetchUsers();
        fetchCustomerOptions();
    }, [user]);

    const fetchCustomerOptions = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/admin/master-customers`);
            const allCustomers = res.data || [];
            
            // RLS Check
            if (user?.type === 'admin') {
                const allowed = allCustomers.filter(c => user?.allowedCustomers?.includes(c));
                setCustomers(allowed);
            } else {
                setCustomers(allCustomers);
            }
        } catch (err) { console.error("Error fetching master customers:", err); }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/admin/users`, {
                params: {
                    currentUserType: user?.type,
                    allowedCustomers: user?.allowedCustomers?.join('|||') // 🔥 Fixed Array Join bug
                }
            });
            setUsers(res.data);
        } catch (err) { console.error("Error fetching users:", err); }
    };

    // 2. DataTable Logic
    useEffect(() => {
        if (users.length >= 0 && activeAdminTab === 'users') {
            const table = $(tableRef.current).DataTable({
                data: users,
                destroy: true,
                pageLength: 25,
                columns: [
                    { 
                        title: "Email", 
                        data: "email",
                        render: (data) => `<div class="font-bold text-slate-800">${data}</div>`
                    },
                    { 
                        title: "System Role", 
                        data: "type",
                        render: (data) => `
                            <span class="px-2 py-1 rounded text-[10px] font-black uppercase ring-1 ${
                                data === 'super_admin' ? 'bg-purple-100 text-purple-700 ring-purple-300' : 'bg-blue-100 text-blue-700 ring-blue-300'
                            }">
                                ${data.replace('_', ' ')}
                            </span>`
                    },
                    { 
                        title: "Customer Access", 
                        data: "customers",
                        render: (data) => `
                            <div class="flex flex-wrap gap-1 max-w-sm">
                                ${data && data.length > 0 
                                    ? data.map(c => `<span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] border border-slate-300">${c}</span>`).join('') 
                                    : '<span class="text-slate-400 text-xs italic">No Access</span>'}
                            </div>`
                    },
                    {
                        title: "Actions",
                        data: null,
                        render: (data, type, row) => {
                            const isSelf = row.email === user?.email;
                            return `
                            <div class="flex gap-4">
                                <button class="edit-btn text-blue-600 hover:text-blue-800 font-bold transition-all cursor-pointer" data-id="${row.id}">
                                    EDIT
                                </button>
                                ${!isSelf ? `
                                    <button class="delete-btn text-rose-600 hover:text-rose-800 font-bold transition-all cursor-pointer" data-id="${row.id}" data-email="${row.email}">
                                        DELETE
                                    </button>
                                ` : `<span class="text-slate-400 text-[10px] font-bold uppercase italic">Current User</span>`}
                            </div>`;
                        }
                    }
                ],
                drawCallback: function() {
                    $('.edit-btn').off('click').on('click', function() {
                        const u = users.find(x => x.id == $(this).data('id'));
                        if (u) {
                            setEditMode(true);
                            setFormData({ id: u.id, email: u.email, password: '', type: u.type, customers: u.customers || [] });
                            setShowModal(true);
                        }
                    });
                    $('.delete-btn').off('click').on('click', function() {
                        handleDelete($(this).data('id'), $(this).data('email'));
                    });
                }
            });
            return () => table.destroy();
        }
    }, [users, user, activeAdminTab]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, currentUserType: user?.type, allowedCustomers: user?.allowedCustomers?.join('|||') };
            if (editMode) {
                await axios.post(`${process.env.REACT_APP_API_URL}/api/data/admin/update-user`, payload);
            } else {
                await axios.post(`${process.env.REACT_APP_API_URL}/api/data/admin/create-user`, payload);
            }
            Swal.fire({ icon: 'success', title: 'Permissions updated!', timer: 2000, showConfirmButton: false });
            setShowModal(false);
            fetchUsers();
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Action failed', 'error'); }
    };

    const handleDelete = (id, email) => {
        Swal.fire({
            title: 'Confirm Deletion',
            text: `Are you sure you want to remove ${email}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#475569'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${process.env.REACT_APP_API_URL}/api/data/admin/delete-user`, {
                        params: { id, email, currentUserType: user?.type }
                    });
                    fetchUsers();
                    Swal.fire('Deleted!', 'User removed.', 'success');
                } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Delete failed', 'error'); }
            }
        });
    };

    return (
        <div className="bg-[#fcfcfd] min-h-screen">
            <div className="max-w-7xl mx-auto py-8 px-4">
                
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Admin Panel</h1>
                    {/* Fixed 'onBack' props undefined issue */}
                    <button onClick={onBack} className="text-blue-600 hover:text-blue-800 font-bold text-sm underline">
                        &larr; Back to Dashboard
                    </button>
                </div>

                {user?.type === 'super_admin' && (
                    <div className="flex border-b border-slate-300 mb-8">
                        <button onClick={() => setActiveAdminTab('users')} className={`px-6 py-3 font-bold text-sm transition-all ${activeAdminTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                            User Management
                        </button>
                        <button onClick={() => setActiveAdminTab('cron')} className={`px-6 py-3 font-bold text-sm transition-all flex items-center gap-2 ${activeAdminTab === 'cron' ? 'border-b-2 border-green-600 text-green-600' : 'text-slate-500 hover:text-slate-800'}`}>
                            ⚙️ Auto-Sync Settings
                        </button>
                    </div>
                )}

                {activeAdminTab === 'users' ? (
                    <div className="font-sans">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                                    <HiOutlineShieldCheck className="text-blue-600" />
                                    Access <span className="text-blue-600">Management</span>
                                </h1>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Control user roles and customer boundaries</p>
                            </div>
                            <button onClick={() => { setEditMode(false); setFormData({ id: '', email: '', password: '', type: 'user', customers: [] }); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest shadow-md transition-all flex items-center gap-2">
                                <HiOutlineUserAdd className="text-lg" /> Create New User
                            </button>
                        </div>

                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-lg">
                            <table ref={tableRef} className="display nowrap w-full text-sm"></table>
                        </div>

                        {showModal && (
                            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                                <div className="bg-white w-full max-w-2xl rounded-[1.5rem] shadow-2xl overflow-hidden">
                                    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                                            {editMode ? 'Edit User Permissions' : 'Configure New User'}
                                        </h2>
                                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 text-3xl font-light">&times;</button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Login Email</label>
                                                <input type="email" disabled={editMode} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-500 transition-all disabled:opacity-50" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="user@nokia.com" required />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Assigned Role</label>
                                                <select className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-500 transition-all" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                                    <option value="user">User (View Only)</option>
                                                    <option value="admin">Admin (Editor)</option>
                                                    {user?.type === 'super_admin' && <option value="super_admin">Super Admin</option>}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                                                Account Password {editMode && <span className="text-blue-500 font-normal">(Leave blank to keep current)</span>}
                                            </label>
                                            <input type="text" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono outline-none focus:border-blue-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editMode ? "Enter only to change..." : "Assign a password"} required={!editMode} />
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                            <div className="flex justify-between items-center mb-3">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assign Customer Access</p>
                                                <div className="flex gap-3">
                                                    <button type="button" onClick={() => setFormData({...formData, customers: [...customers]})} className="text-[10px] font-black text-blue-600 hover:underline uppercase">Select All</button>
                                                    <button type="button" onClick={() => setFormData({...formData, customers: []})} className="text-[10px] font-black text-red-500 hover:underline uppercase">Clear</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                                {customers.map(c => (
                                                    <label key={c} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-blue-300 transition-all shadow-sm">
                                                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" checked={formData.customers.includes(c)} onChange={() => { const next = formData.customers.includes(c) ? formData.customers.filter(x => x !== c) : [...formData.customers, c]; setFormData({ ...formData, customers: next }); }} /> 
                                                        <span className="text-xs font-semibold text-slate-700 truncate">{c}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-3">
                                            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-[0.1em] transition-all shadow-md">
                                                {editMode ? 'Update Account' : 'Initialize Account'}
                                            </button>
                                            <button type="button" onClick={() => setShowModal(false)} className="px-8 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all">
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <AdminCronPanel user={user} />
                )}
            </div>
        </div>
    );
};

export default AdminPanel;