import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, LineChart, Line, ComposedChart } from 'recharts';
// import { HiChevronRight, HiOutlineFilter } from "react-icons/hi";
import FilterBar from '../components/FilterBar';
import { 
    HiOutlineFilter, 
    HiOutlineSearch, 
    HiOutlineRefresh, 
    HiChevronRight, 
    HiOutlineSave, 
    HiDownload, 
    HiOutlineViewGrid,
    HiOutlineSwitchHorizontal,
    HiOutlineSwitchVertical,
    HiOutlineUpload,
} from "react-icons/hi";

const Dashboard = ({ user }) => {
    // 🔥 Added wbs and wbs_description
    const [filters, setFilters] = useState({
        category_type: ['All'], bu: [], customer: [], loa_id: [], loa_name: [], wbs_type: [], wbs: [], wbs_description: [], active_inactive: ['Active'], period: []
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [buData, setBuData] = useState([]);
    const [loaData, setLoaData] = useState([]);
    const [filterOptions, setFilterOptions] = useState({});
    
    const [showAllLoa, setShowAllLoa] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [tableData, setTableData] = useState([]);
    const [tableView, setTableView] = useState('bu');
    const allowedCustomers = user?.allowedCustomers || [];

    const [trendData, setTrendData] = useState([]);
    const [trendLoas, setTrendLoas] = useState([]);
    const [selectedTrendLoa, setSelectedTrendLoa] = useState('');

    const formatNum = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetAllFilters = () => {
        setFilters({ category_type: ['All'], bu: [], customer: [], loa_id: [], loa_name: [], wbs_type: [], wbs: [], wbs_description: [], active_inactive: ['Active'], period: [] });
        setShowAllLoa(false);
    };

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/api/data/trend-loas`).then((res) => setTrendLoas(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        const fetchTrendData = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/non-committed-trend`, {
                    params: {
                        loa_name: selectedTrendLoa,
                        active_inactive: filters.active_inactive.join(','),
                        wbs_type: filters.wbs_type.join(','),
                        category_type: filters.category_type.join(',')
                    }
                });
                setTrendData(res.data);
            } catch (err) { console.error(err); }
        };
        fetchTrendData();
    }, [selectedTrendLoa, filters.active_inactive, filters.wbs_type, filters.category_type]);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const params = {
                    bu: filters.bu.join(','), periods: filters.period.join(','), customers: filters.customer.join(','),
                    loa_names: filters.loa_name.join(','), active_inactive: filters.active_inactive.join(','),
                    type: user?.type, wbs_type: filters.wbs_type.join(','), category_type: filters.category_type.join(','),
                    wbs: filters.wbs.join(','), wbs_description: filters.wbs_description.join(','), // 🔥 Send WBS states to API
                    allowedCustomers: allowedCustomers.join(',')
                };
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/dashboard-filters`, { params });
                
                setFilterOptions({
                    bu: res.data.bus || [], customer: res.data.customers || [], loa_name: res.data.loa_names || [],
                    loa_id: res.data.loa_names || [], period: res.data.periods || [], wbs_type: res.data.wbs_types || [],
                    wbs: res.data.wbs || [], wbs_description: res.data.wbs_descriptions || [], // 🔥 Map WBS data to filter bar
                    category_type: res.data.category_types || ['All', 'Local Materials'], active_inactive: ['Active', 'Inactive']
                });
            } catch (err) { console.error(err); }
        };
        fetchFilters();
    }, [filters, user]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const commonParams = {
                    bu: filters.bu.join(','), periods: filters.period.join(','), customers: filters.customer.join(','),
                    loa_names: filters.loa_name.join(','), category_type: filters.category_type.join(','),
                    active_inactive: filters.active_inactive.join(','), showAll: showAllLoa, type: user?.type,
                    wbs_type: filters.wbs_type.join(','), wbs: filters.wbs.join(','), wbs_description: filters.wbs_description.join(','), // 🔥 Apply WBS Filters
                    allowedCustomers: allowedCustomers.join(',')
                };

                const [buRes, loaRes] = await Promise.all([
                    axios.get(`${process.env.REACT_APP_API_URL}/api/data/analytics-bu`, { params: commonParams }),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/data/analytics-loa`, { params: commonParams })
                ]);

                setBuData(buRes.data);
                setLoaData(loaRes.data);

                let endpoint = 'final-dashboard-table';
                if (tableView === 'loa') endpoint = 'cost-view-table';
                else if (tableView === 'customer') endpoint = 'customer-view-table';
                else if (tableView === 'bu-customer') endpoint = 'bu-customer-view-table';
                else if (tableView === 'customer-bu') endpoint = 'customer-bu-view-table';
                else if (tableView === 'negative-loa') endpoint = 'negative-loa-table';
                else if (tableView === 'customer-bu-loa') endpoint = 'customer-bu-loa-view-table';

                const tableRes = await axios.get(`${process.env.REACT_APP_API_URL}/api/data/${endpoint}`, { params: commonParams });
                setTableData(tableRes.data);
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchData();
    }, [filters, showAllLoa, tableView, user]);

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(tableData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Dashboard Table");
        XLSX.writeFile(workbook, "final_dashboard_table.xlsx");
    };

    const columnsToShow = 
        tableView === 'bu' ? ['bu', 'asbl', 'asbl_loa', 'ptd', 'open_commitment', 'non_committed', 'eac', 'eac_vs_asbl'] :
        tableView === 'bu-customer' ? ['bu', 'customer', 'asbl', 'asbl_loa', 'ptd', 'open_commitment', 'non_committed', 'eac', 'eac_vs_asbl'] :
        tableView === 'loa' ? ['bu', 'customer', 'loa_id', 'loa_name', 'asbl', 'asbl_loa', 'ptd', 'open_commitment', 'non_committed', 'eac', 'eac_vs_asbl'] :
        tableView === 'customer-bu' ? ['customer', 'bu', 'asbl', 'asbl_loa', 'ptd', 'open_commitment', 'non_committed', 'eac', 'eac_vs_asbl'] :
        tableView === 'negative-loa' ? ['bu', 'customer', 'loa_id', 'loa_name', 'asbl', 'asbl_loa', 'ptd', 'open_commitment', 'non_committed', 'eac', 'eac_vs_asbl'] :
        tableView === 'customer-bu-loa' ? ['customer', 'bu', 'loa_name', 'asbl', 'asbl_loa', 'ptd', 'open_commitment', 'non_committed', 'eac', 'eac_vs_asbl'] :
        ['customer', 'asbl', 'asbl_loa', 'ptd', 'open_commitment', 'non_committed', 'eac', 'eac_vs_asbl'];

    const predefinedOrder = ['IP', 'Optics', 'FN'];
    const sortedBuData = [...buData].sort((a, b) => {
        const indexA = predefinedOrder.indexOf(a.bu);
        const indexB = predefinedOrder.indexOf(b.bu);
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

    const displayLoaData = showAllLoa ? loaData : loaData.slice(0, 10);
    const isWbsSelected = filters.wbs_type && filters.wbs_type.length > 0 && !filters.wbs_type.includes('All');

    return (
        <div className="p-4 md:p-6 bg-[#fcfcfd] min-h-screen relative overflow-hidden">
            <div className={`transition-all duration-300 ${isSidebarOpen ? 'mr-[380px]' : 'mr-[40px]'}`}>
                
                {!isWbsSelected && (
                    <div className="mb-6 p-4 border border-orange-200 bg-orange-50/80 rounded-3xl text-sm text-orange-800 flex items-center gap-3 shadow-sm">
                        <span className="mb-2 text-xl">⚠️</span>
                        <div>
                            <span className="font-extrabold uppercase tracking-wide mr-1.5">Please select a specific WBS Type (Project or AMC or Warranty/Other) to unlock ASBL & Non Committed values.</span> 
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[1.5rem] p-6 shadow-lg border border-slate-100 mb-8">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
                        <h2 className="text-2xl font-black font-semibold text-slate-800 uppercase">Summary (K€)</h2>
                        
                        <div className="flex flex-wrap items-center gap-2 xl:gap-3 ml-auto">
                            <p className="text-xs font-medium text-slate-800 uppercase tracking-wider mr-2">
  Quick Views: 
</p>
                            <button
                                onClick={() => setTableView('bu')}
                                className={`border border-slate-300 border-t-4 px-5 py-2 rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-semibold
                                    ${tableView === 'bu'
                                        ? 'border-t-[#124191] bg-[#2563EB] text-white'
                                        : 'border-t-slate-800 bg-white text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                BU Only
                            </button>
 
                            <button
                                onClick={() => setTableView('bu-customer')}
                                className={`border border-slate-300 border-t-4 px-5 py-2 rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-semibold
                                    ${tableView === 'bu-customer'
                                        ? 'border-t-[#124191] bg-[#2563EB] text-white'
                                        : 'border-t-slate-800 bg-white text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                BU + Customer
                            </button>
 
                            <button
                                onClick={() => setTableView('loa')}
                                className={`border border-slate-300 border-t-4 px-5 py-2 rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-semibold
                                    ${tableView === 'loa'
                                        ? 'border-t-[#124191] bg-[#2563EB] text-white'
                                        : 'border-t-slate-800 bg-white text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                BU + Cust + LOA
                            </button>
                            <button
                                onClick={() => setTableView('customer')}
                                className={`border border-slate-300 border-t-4 px-5 py-2 rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-semibold
                                    ${tableView === 'customer'
                                        ? 'border-t-[#124191] bg-[#2563EB] text-white'
                                        : 'border-t-slate-800 bg-white text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                Customer Only
                            </button>
 
                            <button
                                onClick={() => setTableView('customer-bu')}
                                className={`border border-slate-300 border-t-4 px-5 py-2 rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-semibold
                                    ${tableView === 'customer-bu'
                                        ? 'border-t-[#124191] bg-[#2563EB] text-white'
                                        : 'border-t-slate-800 bg-white text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                Customer + BU
                            </button>
 
                            <button
                                onClick={() => setTableView('customer-bu-loa')}
                                className={`border border-slate-300 border-t-4 px-5 py-2 rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-semibold
                                    ${tableView === 'customer-bu-loa'
                                        ? 'border-t-[#124191] bg-[#2563EB] text-white'
                                        : 'border-t-slate-800 bg-white text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                Customer + BU + LOA
                            </button>
 
                            <button
                                onClick={() => setTableView('negative-loa')}
                                className={`border border-slate-300 border-t-4 px-5 py-2 rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-semibold
                                    ${tableView === 'negative-loa'
                                        ? 'border-t-[#124191] bg-[#2563EB] text-white'
                                        : 'border-t-slate-800 bg-white text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                -ve LOA
                            </button>

                            <button onClick={exportToExcel} className="border border-slate-300 border-t-4 border-t-blue-500 bg-white px-5 py-2 shadow-sm hover:shadow-md transition-all flex items-center gap-2 rounded-lg">
                                                        <HiOutlineUpload className="text-blue-600" /> 
                                                        <span className="text-sm font-semibold text-blue-700">Export</span>
                                                    </button>
                            
                            {/* <button onClick={exportToExcel} className="bg-emerald-500 text-white px-5 py-2 rounded-xl text-[13px] font-bold shadow-md hover:bg-emerald-600 transition-all ml-2 flex items-center gap-2">
                                📥 EXPORT
                            </button> */}
                        </div>
                    </div>

                    <div className="overflow-auto max-h-[400px] border border-slate-200 rounded-xl custom-scrollbar">
                        <table className="min-w-full text-sm border-collapse">
                            <thead className="bg-[#004593] sticky top-0 z-10 shadow-sm">
                                <tr>
                                    {columnsToShow.map((col) => (
                                        <th
                                            key={col}
                                            className="border border-[#003a7a] px-4 py-3 text-center font-black text-white text-[11px] uppercase tracking-wider"
                                        >
                                            {col.replaceAll('_', ' ')}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData && tableData.length > 0 ? tableData.map((row, index) => (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                        {columnsToShow.map((col) => (
                                            <td key={col} className="border border-slate-200 px-4 py-3 text-slate-700 font-medium text-center">
                                                {['asbl','asbl_loa','ptd','open_commitment','non_committed','eac','eac_vs_asbl'].includes(col) 
                                                    ? (row[col] !== null && row[col] !== undefined ? formatNum(row[col]) : "") 
                                                    : row[col]}
                                            </td>
                                        ))}
                                    </tr>
                                )) : (
                                    <tr><td colSpan={columnsToShow.length} className="border border-slate-200 text-center py-8 text-slate-400 font-bold uppercase">No Data Found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. BU KPI SECTION */}
                <div className="bg-white rounded-[1.5rem] shadow-lg p-6 mb-8 border border-slate-100">
                    <h2 className="text-2xl font-black font-semibold text-slate-800 uppercase tracking-tight mb-6">Business Unit (K€)</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {sortedBuData.map((item) => {
                            const ptdPerc = item.asbl > 0 ? ((item.ptd / item.asbl) * 100).toFixed(1) : "0.0";
                            const eacPerc = item.asbl > 0 ? ((item.eac / item.asbl) * 100).toFixed(1) : "0.0";
                            
                            let ptdColor = 'bg-slate-50 border-slate-200 text-slate-400';
                            let eacColor = 'bg-slate-50 border-slate-200 text-slate-400';

                            if (isWbsSelected) {
                                ptdColor = parseFloat(ptdPerc) <= 100 ? 'font-semibold bg-blue-100 border-blue-500 text-black' : 'font-semibold bg-blue-100 border-blue-500 text-black';
                                eacColor = item.eac_vs_asbl >= 0 ? 'font-normal bg-blue-100 border-blue-500 text-black' : 'font-normal bg-blue-100 border-blue-500 text-black';
                            }

                            return (
                                <div key={item.bu} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                                    <div className="flex-shrink-0 bg-[#124191] text-white px-3 py-4 rounded-xl flex flex-col items-center justify-center min-w-[70px] min-h-[72px] shadow-inner">
                                        {/* <span className="text-[8px] font-bold uppercase tracking-wider opacity-80 mb-1">BU</span> */}
                                        <span className="text-sm font-black tracking-tight">{item.bu}</span>
                                    </div>
                                    
                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                        <div className={`p-3 rounded-xl border ${ptdColor} text-center flex flex-col justify-center transition-colors`}>
                                            <p className="text-[12px] font-bold uppercase mb-1 opacity-80">PTD Util %</p>
                                            <p className="text-[24px] font-semibold text-lg font-black">{ptdPerc}%</p>
                                        </div>
                                        <div className={`p-3 rounded-xl border ${eacColor} text-center flex flex-col justify-center transition-colors`}>
                                            <p className="text-[12px] font-bold uppercase mb-1 opacity-80">EAC vs ASBL</p>
                                            <p className="text-[24px] font-semibold text-lg font-black">{eacPerc}%</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="w-full h-[450px] mt-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sortedBuData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} barGap={10} barCategoryGap="25%">
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f901" />
                                <XAxis dataKey="bu" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontSize: 13, fontWeight: 900 }} dy={10}/>
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b800', fontSize: 11 }} />
                                
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} formatter={(value, name) => [formatNum(value), String(name).toUpperCase()]} />
                                <Legend verticalAlign="top" align="right" iconType="circle" formatter={(value) => <span style={{ color: '#475569', fontWeight: '800', textTransform: 'uppercase', fontSize: '12px', marginRight: '10px' }}>{String(value).toUpperCase()}</span>} />

                                <Bar dataKey="asbl" name="ASBL" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={100}><LabelList dataKey="asbl" position="top" formatter={(v) => formatNum(v)} style={{ fontSize: '16px', fontWeight: '600', fill: '#1e293b' }} offset={10}/></Bar>
                                <Bar dataKey="eac" name="EAC" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={100}><LabelList dataKey="eac" position="top" formatter={(v) => formatNum(v)} style={{ fontSize: '16px', fontWeight: '600', fill: '#1e293b' }} offset={10}/></Bar>
                                <Bar dataKey="ptd" name="PTD" fill="#10b981" radius={[6, 6, 0, 0]} barSize={100}><LabelList dataKey="ptd" position="top" formatter={(v) => formatNum(v)} style={{ fontSize: '16px', fontWeight: '600', fill: '#1e293b' }} offset={10}/></Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. LOA GRAPH SECTION */}
                <div className="bg-white rounded-[1.5rem] shadow-lg p-6 mb-8 relative border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-black font-semibold text-slate-800 uppercase tracking-tight">LOA Analytics (K€)</h2>
                            <p className="text-slate-400 text-sm mt-1 font-semibold">ASBL • PTD • EAC Comparison</p>
                        </div>
                        <button onClick={() => setShowAllLoa(!showAllLoa)} className="px-5 py-2.5 rounded-xl bg-[#124191] text-white text-[13px] font-bold shadow-md hover:bg-blue-800 transition-all">
                            {showAllLoa ? 'SHOW TOP 10 ONLY' : 'SHOW ALL LOAs'}
                        </button>
                    </div>
                    <div className="w-full max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        <ResponsiveContainer width="100%" height={showAllLoa ? Math.max(displayLoaData.length * 60, 400) : 500}>
                            <BarChart data={displayLoaData} layout="vertical" barSize={15} margin={{ top: 10, right: 40, left: 80, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b801'}}/>
                                <YAxis dataKey="loa_name" type="category" width={250} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 700 }} />
                                <Tooltip formatter={(value, name) => [formatNum(value), String(name).toUpperCase()]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}/>
                                <Legend verticalAlign="top"  align="right" iconType="circle" formatter={(value) => <span style={{ color: '#475569', fontWeight: '800', textTransform: 'uppercase', fontSize: '11px' }}>{String(value).toUpperCase()}</span>}/>
                                <Bar dataKey="asbl" name="ASBL" fill="#2563eb" radius={[0, 4, 4, 0]}><LabelList dataKey="asbl" position="right" formatter={(v) => formatNum(v)} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e293b' }} /></Bar>
                                <Bar dataKey="eac" name="EAC" fill="#f59e0b" radius={[0, 4, 4, 0]}><LabelList dataKey="eac" position="right" formatter={(v) => formatNum(v)} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e293b' }} /></Bar>
                                <Bar dataKey="ptd" name="PTD" fill="#10b981" radius={[0, 4, 4, 0]}><LabelList dataKey="ptd" position="right" formatter={(v) => formatNum(v)} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e293b' }} /></Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 5. TREND GRAPH */}
                <div className="bg-white rounded-[1.5rem] shadow-lg p-6 relative border border-slate-100">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                        <h2 className="text-2xl font-black font-semibold text-slate-800 uppercase tracking-tight">Non Committed Trend</h2>
                        <select value={selectedTrendLoa} onChange={(e) => setSelectedTrendLoa(e.target.value)} className="border border-slate-300 bg-slate-50 text-slate-700 font-bold rounded-xl px-4 py-2 outline-none">
                            <option value="">ALL LOAs</option>
                            {trendLoas.map((item) => (<option key={item.loa_name} value={item.loa_name}>{item.loa_name.toUpperCase()}</option>))}
                        </select>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Selected LOA</div>
                            <div className="text-lg font-black text-blue-700 mt-1 truncate" title={selectedTrendLoa || 'ALL'}>{selectedTrendLoa ? selectedTrendLoa.toUpperCase() : 'ALL'}</div>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Latest Value</div>
                            <div className="text-xl font-black text-green-700 mt-1">{trendData.length > 0 ? formatNum(trendData[trendData.length - 1]?.total_non_committed) : '0.00'}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available Months</div>
                            <div className="text-xl font-black text-purple-700 mt-1">{trendData.length}</div>
                        </div>
                    </div>

                    <div className="w-full h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month_year" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} formatter={(value, name) => [formatNum(value), "NON COMMITTED"]} />
                                <Legend verticalAlign="top" align="right" iconType="circle" formatter={(value) => <span style={{ color: '#475569', fontWeight: '800', textTransform: 'uppercase', fontSize: '12px' }}>NON COMMITTED</span>} />
                                <Bar dataKey="total_non_committed" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={80}><LabelList dataKey="total_non_committed" position="top" formatter={(v) => formatNum(v)} style={{ fontSize: '11px', fontWeight: '800', fill: '#1e293b' }} offset={10}/></Bar>
                                <Line type="monotone" dataKey="total_non_committed" stroke="#0f172a" strokeWidth={3} dot={{ r: 5, fill: '#0f172a' }} legendType="none" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* 🔵 FIXED POWER BI SIDEBAR */}
            <div className={`fixed right-0 top-0 h-screen bg-white border-l border-slate-200 transition-all duration-300 z-[2001] shadow-2xl flex flex-col ${isSidebarOpen ? 'w-[350px]' : 'w-[40px]'}`}>
                
                {!isSidebarOpen && (
                    <div onClick={() => setIsSidebarOpen(true)} className="h-full w-full flex flex-col items-center pt-8 cursor-pointer hover:bg-slate-50 transition-colors">
                        <HiOutlineFilter className="text-xl mb-4 text-blue-600" />
                        <span className="font-black text-[13px] tracking-[0.2em] text-slate-700 uppercase" style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}>Filters</span>
                    </div>
                )}

                {isSidebarOpen && (
                    <>
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <span className="font-black text-lg text-slate-800 tracking-tight uppercase">Filters Pane</span>
                            <div className="flex gap-3 items-center">
                                <button onClick={resetAllFilters} className="text-[11px] font-black uppercase text-red-500 hover:underline">Reset All</button>
                                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600"><HiChevronRight className="text-2xl" /></button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-white">
                            <FilterBar filters={filters} options={filterOptions} onFilterChange={handleFilterChange} onReset={resetAllFilters} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;