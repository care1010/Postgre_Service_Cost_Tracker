import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import $ from 'jquery';
import 'select2';
import 'select2/dist/css/select2.min.css';
import './AsblAutomation.css';
import Swal from 'sweetalert2';
import { HiOutlineRefresh, HiOutlineTrendingUp, HiFilter, HiX, HiSearch } from "react-icons/hi";

const AsblAutomation = ({ user }) => {
    const [loading, setLoading] = useState(false);
    const [selectedWbsType, setSelectedWbsType] = useState('');
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [selectedLoa, setSelectedLoa] = useState('');
    const [selectedLoaId, setSelectedLoaId] = useState('');
    const [projectData, setProjectData] = useState([]);
   
    // Pro Filtering States
    const [tableFilters, setTableFilters] = useState({ categories: [], asbl: [] });
    const [activeFilterMenu, setActiveFilterMenu] = useState(null);
    const [filterSearch, setFilterSearch] = useState('');

    const nameSelectRef = useRef(null);
    const idSelectRef = useRef(null);
    const filterMenuRef = useRef(null);

    const WBS_TYPES_MASTER = ["Project", "AMC", "Warranty/Other"];
    const customersStr = user?.allowedCustomers ? user.allowedCustomers.join(',') : '';

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
                setActiveFilterMenu(null);
                setFilterSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleReset = () => {
        setSelectedWbsType('');
        setSelectedLoa('');
        setSelectedLoaId('');
        setProjectData([]);
        setFilteredProjects([]);
        setTableFilters({ categories: [], asbl: [] });
        $(nameSelectRef.current).val(null).trigger('change');
        $(idSelectRef.current).val(null).trigger('change');
    };

    // 1. Fetch Projects
    useEffect(() => {
        if (selectedWbsType) {
            axios.get(`${process.env.REACT_APP_API_URL}/api/data/filtered-projects`, {
                params: { wbs_type: selectedWbsType, type: user?.type, allowedCustomers: customersStr }
            })
            .then(res => {
                // 🔥 FIX: Ensures res.data is always an array before calling .filter()
                const dataArray = Array.isArray(res.data) ? res.data : [];
                const unique = dataArray.filter((v, i, a) => a.findIndex(t => t.loa_id === v.loa_id) === i);
                setFilteredProjects(unique);
            }).catch(err => console.error(err));
        }
    }, [selectedWbsType, user, customersStr]);

    // 2. Select2 Logic
    useEffect(() => {
        const setup = (ref, type) => {
            const el = $(ref.current);
            el.select2({ placeholder: `Select ${type}...`, width: '100%', allowClear: true, dropdownParent: el.parent(), dropdownAutoWidth: false })
            .on('change', (e) => {
                const val = e.target.value;
                if (!val) { if (type === 'Name') setSelectedLoa(''); else setSelectedLoaId(''); return; }
                const match = filteredProjects.find(p => type === 'Name' ? p.loa_name === val : p.loa_id === val);
                if (match) {
                    setSelectedLoa(match.loa_name); setSelectedLoaId(match.loa_id);
                    if (type === 'Name') $(idSelectRef.current).val(match.loa_id).trigger('change.select2');
                    else $(nameSelectRef.current).val(match.loa_name).trigger('change.select2');
                }
            });
        };
        setup(nameSelectRef, 'Name'); setup(idSelectRef, 'ID');
        return () => { $(nameSelectRef.current).select2('destroy'); $(idSelectRef.current).select2('destroy'); };
    }, [filteredProjects]);

    // 3. Fetch Details
    useEffect(() => {
        if (selectedLoaId && selectedWbsType) {
            setLoading(true);
            axios.get(`${process.env.REACT_APP_API_URL}/api/data/project-details`, {
                params: { loa_id: selectedLoaId, wbs_type: selectedWbsType, type: user?.type, allowedCustomers: customersStr }
            }).then(res => {
                setProjectData(res.data.map(row => ({ ...row, original_asbl: row.asbl })));
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [selectedLoaId, selectedWbsType, user, customersStr]);

    const filteredData = useMemo(() => {
        return projectData.filter(row => {
            const catMatch = tableFilters.categories.length === 0 || tableFilters.categories.includes(row.categories);
            const asblMatch = tableFilters.asbl.length === 0 || tableFilters.asbl.includes(String(row.asbl));
            return catMatch && asblMatch;
        });
    }, [projectData, tableFilters]);

    const totalAsbl = useMemo(() => filteredData.reduce((sum, row) => sum + (parseFloat(row.asbl) || 0), 0), [filteredData]);

    const handleManualSave = async () => {
    if (!selectedLoaId || !selectedWbsType) return;
    const changedRows = projectData.filter(row => Number(row.asbl) !== Number(row.original_asbl));
    if (changedRows.length === 0) return Swal.fire("Info", "No changes.", "info");

    try {
        Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        await axios.post(`${process.env.REACT_APP_API_URL}/api/data/update-manual-asbl`, { 
            loa_id: selectedLoaId, 
            wbs_type: selectedWbsType, 
            updates: changedRows,
            updatedBy: user?.email || 'Unknown' // 🔥 NAYA: User email yahan se bhejiye
        });

        setProjectData(projectData.map(r => ({ ...r, original_asbl: r.asbl })));
        Swal.fire("Saved!", "Success", "success");
    } catch (err) { Swal.fire("Error", "Fail", "error"); }
};

    // 🔥 PRO FILTER MENU COMPONENT
    const FilterMenu = ({ field, options, onClear }) => {
        const uniqueValues = Array.from(new Set(options.map(o => String(o))));
        const displayValues = uniqueValues.filter(v => v.toLowerCase().includes(filterSearch.toLowerCase()));

        return (
            <div ref={filterMenuRef} className="absolute top-full left-0 mt-2 z-[999] w-72 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-200 focus-within:border-blue-400 transition-all">
                        <HiSearch className="text-slate-400" />
                        <input autoFocus className="bg-transparent border-none outline-none text-xs w-full font-bold text-slate-700" placeholder="Search values..."
                               value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
                    </div>
                </div>
               
                <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
                    <label className="flex items-center gap-3 p-2.5 hover:bg-blue-50 rounded-xl cursor-pointer transition-all group">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                               checked={tableFilters[field].length === uniqueValues.length}
                               onChange={() => setTableFilters(prev => ({ ...prev, [field]: prev[field].length === uniqueValues.length ? [] : uniqueValues }))} />
                        <span className="text-[11px] font-black uppercase text-slate-600 group-hover:text-blue-700 leading-none">Select All</span>
                    </label>
                    <div className="h-px bg-slate-100 my-1 mx-2"></div>
                    {displayValues.map(val => (
                        <label key={val} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-all group">
                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                   checked={tableFilters[field].includes(val)}
                                   onChange={() => setTableFilters(prev => {
                                       const current = prev[field];
                                       const updated = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
                                       return { ...prev, [field]: updated };
                                   })} />
                            <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 truncate">{val}</span>
                        </label>
                    ))}
                </div>

                <div className="p-3 bg-grey-50 border-t border-grey-100 flex justify-between items-center">
                    <button onClick={onClear} className="flex items-center gap-1 text-[13px] font-black uppercase text-red-400 hover:text-red-600 transition-colors">
                        <HiX className="text-sm" /> Reset Filter
                    </button>
                    <button onClick={() => setActiveFilterMenu(null)} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">OK</button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 bg-[#f8fafc] min-h-screen space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-grey-100 relative">
                <div className="flex flex-wrap items-end gap-4 mb-8">
                    <div className="w-full md:w-40">
                        <label className="text-[13px] font-black text-grey-400 uppercase mb-2 block tracking-tighter">1. WBS Type</label>
                        <select value={selectedWbsType} onChange={(e) => setSelectedWbsType(e.target.value)} className="w-full bg-grey-100 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-600 outline-none hover:bg-grey-200 transition-colors">
                            <option value="">-- Choose --</option>
                            {WBS_TYPES_MASTER.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="w-full md:w-56 relative">
                        <label className="text-[13px] font-black text-grey-400 uppercase mb-2 block tracking-tight">2. LOA ID</label>
                        <select ref={idSelectRef} disabled={!selectedWbsType} className="w-full"><option value=""></option>{filteredProjects.map((p, i) => <option key={`id-${i}`} value={p.loa_id}>{p.loa_id}</option>)}</select>
                    </div>
                    <div className="w-full md:w-96 relative">
                        <label className="text-[13px] font-black text-grey-400 uppercase mb-2 block tracking-tight">3. Project Name</label>
                        <select ref={nameSelectRef} disabled={!selectedWbsType} className="w-full"><option value=""></option>{filteredProjects.map((p, i) => <option key={`name-${i}`} value={p.loa_name}>{p.loa_name}</option>)}</select>
                    </div>
                    <div className="w-full md:w-48 bg-blue-600 rounded-2xl p-3 text-white shadow-xl flex items-center gap-3 transform hover:scale-105 transition-all">
                        <HiOutlineTrendingUp className="text-2xl opacity-50" />
                        <div><p className="text-[13px] font-black uppercase opacity-70">Total (KEUR)</p><p className="text-lg font-black">{totalAsbl.toFixed(2)}</p></div>
                    </div>
                    <div className="flex gap-2 ml-auto">
                        <button onClick={handleReset} className="px-4 py-2 rounded-xl bg-grey-100 text-grey-500 font-bold text-[11px] uppercase flex items-center gap-1 hover:bg-grey-200 transition-all"><HiOutlineRefresh /> Reset all</button>
                        <button onClick={handleManualSave} className="px-8 py-2 rounded-xl bg-emerald-500 text-white font-black text-[11px] uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-600 active:scale-95 transition-all">Save Changes</button>
                    </div>
                </div>

                {projectData.length > 0 && (
                    <div className="overflow-visible rounded-3xl border border-grey-100 bg-white">
                        <table className="w-full text-left text-sm table-fixed">
                            <thead className="bg-[#1e293b] text-white font-black uppercase text-[13px] tracking-widest sticky top-0 z-40">
                                <tr>
                                    <th className="p-5 w-1/4">LOA ID</th>
                                   
                                    <th className="p-5 w-1/2 relative group">
                                        <div className="flex items-center justify-between cursor-pointer group" onClick={() => setActiveFilterMenu(activeFilterMenu === 'categories' ? null : 'categories')}>
                                            <span className={tableFilters.categories.length > 0 ? "text-emerald-400" : ""}>Category</span>
                                            <HiFilter className={`text-sm transition-all ${tableFilters.categories.length > 0 ? "text-emerald-400 scale-125" : "text-grey-500 group-hover:text-white"}`} />
                                        </div>
                                        {activeFilterMenu === 'categories' && (
                                            <FilterMenu field="categories" options={projectData.map(p => p.categories)} onClear={() => setTableFilters(prev => ({...prev, categories: []}))} />
                                        )}
                                    </th>

                                    <th className="p-5 w-1/4 relative">
                                        <div className="flex items-center justify-end gap-3 cursor-pointer group" onClick={() => setActiveFilterMenu(activeFilterMenu === 'asbl' ? null : 'asbl')}>
                                            <span className={tableFilters.asbl.length > 0 ? "text-emerald-400" : ""}>ASBL (KEUR)</span>
                                            <HiFilter className={`text-sm transition-all ${tableFilters.asbl.length > 0 ? "text-emerald-400 scale-125" : "text-grey-500 group-hover:text-white"}`} />
                                        </div>
                                        {activeFilterMenu === 'asbl' && (
                                            <FilterMenu field="asbl" options={projectData.map(p => p.asbl)} onClear={() => setTableFilters(prev => ({...prev, asbl: []}))} />
                                        )}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {filteredData.map((row, i) => (
                                    <tr key={i} className="border-b border-grey-50 hover:bg-blue-50/40 transition-all group">
                                        <td className="p-4 font-black text-black-600 text-sm opacity-80">{i === 0 ? row.loa_id : ""}</td>
                                        <td className="p-4 font-bold text-grey-600 text-sm truncate">{row.categories}</td>
                                        <td className="p-2 text-right">
                                            <input type="number" value={row.asbl}
                                                onChange={(e) => {
                                                    const updated = [...projectData];
                                                    const realIndex = projectData.findIndex(p => p.categories === row.categories);
                                                    updated[realIndex].asbl = e.target.value;
                                                    setProjectData(updated);
                                                }}
                                                className="w-32 p-2.5 border border-grey-100 rounded-xl text-right font-mono font-black text-grey-700 bg-grey-50 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
               
                {selectedWbsType && projectData.length === 0 && !loading && (
                    <div className="py-24 text-center text-grey-300 font-bold border-2 border-dashed rounded-[2rem] uppercase tracking-widest bg-grey-50/50">Select WBS TYPE to input ASBL values.</div>
                )}
            </div>
        </div>
    );
};

export default AsblAutomation;