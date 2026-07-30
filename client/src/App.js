import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom'; 
import Sidebar from './components/Sidebar';
import SummaryView from './pages/SummaryView';
import AddProject from './pages/AddProject';
import PtdAutomation from './pages/PtdAutomation';
import AsblAutomation from './pages/AsblAutomation';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import DrillDownPage from './pages/DrillDownPage';
import MyAccess from './pages/MyAccess';
import Logs from './pages/Logs';
import ERPResource from './pages/ERPResource';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const location = useLocation(); 

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // Role Protection
  useEffect(() => {
    if (user) {
      if (user.type === 'user' && activeTab === 'admin') {
        setActiveTab('summary');
      }
    }
  }, [activeTab, user]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setActiveTab('summary');
  };

  if (!user) {
    return <Login onLoginSuccess={(userData) => setUser(userData)} />;
  }

  const isDrillDown = location.pathname === '/drilldown';

  return (
    <div className="flex bg-slate-50 min-h-screen">
      {!isDrillDown && (
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
      )}

      <main className={`flex-1 ${isDrillDown ? 'ml-0' : ''} p-8 bg-[#fcfcfd] min-h-screen overflow-x-hidden`}
        style={!isDrillDown ? { marginLeft: '130px', width: "calc(100vw - 130px)" } : {}}>
        
        {!isDrillDown && (
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">
                    NI INDIA Financial Cost Tracker
                </h1>
            </div>
        )}

        <Routes>
          <Route path="/" element={
            <>
              {/* 🟢 LAZY TAB RENDERING: Loads ONLY the active tab! Drops initial server queries from 12 to 2! */}
              {activeTab === 'summary' && <SummaryView user={user} />}
              {activeTab === 'add-project' && <AddProject user={user} />}
              {activeTab === 'ptd' && <PtdAutomation />}
              {activeTab === 'asbl' && <AsblAutomation user={user} />}
              {activeTab === 'dashboard' && <Dashboard user={user} />}
              {activeTab === 'erp_resource' && <ERPResource />}
              {activeTab === 'admin' && (user?.type === 'super_admin' || user?.type === 'admin') && (
                <AdminPanel user={user} onBack={() => setActiveTab('summary')} />
              )}
              {activeTab === 'my-access' && (<MyAccess user={user} />)}
              {activeTab === 'logs' && (<Logs />)}
              
              {['ftc'].includes(activeTab) && (
                <div className="bg-white p-20 rounded-xl shadow text-center border-2 border-dashed border-gray-200">
                  <h2 className="text-xl font-bold text-gray-700 capitalize">{activeTab} Page</h2>
                  <p className="text-gray-400 mt-2">This module is under development.</p>
                </div>
              )}
            </>
          } />

          <Route path="/drilldown" element={<DrillDownPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;