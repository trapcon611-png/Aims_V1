'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  Eye, 
  EyeOff, 
  Search, 
  UserCheck, 
  Key, 
  Menu, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  UserPlus, 
  Sun, 
  Moon, 
  ChevronLeft, 
  ChevronRight,
  Server
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://76.13.247.225:3001';

export default function SecurityPanel() {
  const [isAuth, setIsAuth] = useState(false);
  const [creds, setCreds] = useState({ id: '', pass: '' });
  
  const [admins, setAdmins] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('parents');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // New Admin Form State
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', role: 'TEACHER' });

  // Hardcoded Login for Security Master Access
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (creds.id === 'security_admin' && creds.pass === 'secure_master_key') {
      setIsAuth(true);
      fetchData();
    } else {
      alert("Access Denied: Invalid Security Clearance");
    }
  };

  const fetchData = async () => {
    const adminsRes = await fetch(`${API_URL}/erp/security/admins`);
    if(adminsRes.ok) setAdmins(await adminsRes.json());

    const parentsRes = await fetch(`${API_URL}/erp/security/directory`);
    if(parentsRes.ok) setParents(await parentsRes.json());
  };

  const toggleVisibility = async (parentId: string, currentStatus: boolean) => {
    await fetch(`${API_URL}/erp/security/mobile-visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId, isVisible: !currentStatus })
    });
    fetchData(); 
  };

  const toggleAllVisibility = async (status: boolean) => {
    if(!confirm(`Security Alert:\n\nAre you sure you want to ${status ? 'UNMASK' : 'MASK'} all parent mobile numbers for the Director?`)) return;

    await fetch(`${API_URL}/erp/security/mobile-visibility/all`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: status })
    });
    fetchData();
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/erp/security/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin)
      });
      if(res.ok) {
        alert("System User Created Successfully");
        setNewAdmin({ username: '', password: '', role: 'TEACHER' });
        fetchData();
      } else {
        alert("Failed to create user. Username might exist.");
      }
    } catch (e) { alert("Network Error"); }
  };

  // FILTER & PAGINATION LOGIC
  const filteredParents = parents.filter(p => 
    p.parentId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.mobile.includes(searchQuery)
  );

  const paginatedParents = filteredParents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredParents.length / ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  // THEME CONFIGURATION
  const theme = {
    bg: isDarkMode ? 'bg-black' : 'bg-slate-50',
    text: isDarkMode ? 'text-green-500' : 'text-slate-800',
    border: isDarkMode ? 'border-green-900' : 'border-slate-300',
    cardBg: isDarkMode ? 'bg-gray-950' : 'bg-white',
    inputBg: isDarkMode ? 'bg-black border-green-900/50 text-green-400' : 'bg-white border-slate-300 text-slate-900',
    headerBg: isDarkMode ? 'bg-black/90' : 'bg-white/90',
    buttonPrimary: isDarkMode ? 'bg-green-900/20 text-green-500 border-green-500/50 hover:bg-green-900/40' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    buttonDestructive: isDarkMode ? 'bg-red-900/20 text-red-500 border-red-900 hover:bg-red-900/40' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    accent: isDarkMode ? 'text-green-400' : 'text-blue-600',
    subtext: isDarkMode ? 'text-gray-500' : 'text-slate-500',
    rowHover: isDarkMode ? 'hover:border-green-700/50 bg-black/40' : 'hover:border-blue-400 bg-slate-50/50',
    tabActive: isDarkMode ? 'bg-green-900/30 border-green-500 text-green-300' : 'bg-blue-600 text-white border-blue-600',
    tabInactive: isDarkMode ? 'border-green-900 text-gray-500 hover:text-green-400' : 'border-slate-200 text-slate-500 hover:bg-slate-100',
    paginationBtn: isDarkMode ? 'bg-black border-green-900 text-green-500 hover:bg-green-900/20' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
  };

  if (!isAuth) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${theme.bg}`}>
        <div className={`w-full max-w-sm border ${theme.border} ${theme.cardBg} p-6 md:p-8 rounded-2xl shadow-xl transition-colors duration-300`}>
          <div className="flex justify-center mb-6">
            <ShieldAlert className={`h-14 w-14 md:h-16 md:w-16 animate-pulse ${theme.accent}`} />
          </div>
          <h1 className={`text-xl md:text-2xl font-mono text-center mb-8 uppercase tracking-widest ${theme.text}`}>Security Override</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input className={`w-full border p-3 rounded font-mono focus:outline-none transition-colors ${theme.inputBg}`} placeholder="AGENT ID" value={creds.id} onChange={e=>setCreds({...creds, id:e.target.value})} />
            <input className={`w-full border p-3 rounded font-mono focus:outline-none transition-colors ${theme.inputBg}`} type="password" placeholder="ACCESS KEY" value={creds.pass} onChange={e=>setCreds({...creds, pass:e.target.value})} />
            <button className={`w-full border py-3 rounded font-mono font-bold transition-all active:scale-95 ${theme.buttonPrimary}`}>AUTHENTICATE</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-mono pb-10 transition-colors duration-300 ${theme.bg} ${theme.text}`}>
      {/* HEADER */}
      <header className={`flex flex-col md:flex-row justify-between items-center p-4 md:p-8 border-b ${theme.border} ${theme.headerBg} sticky top-0 z-50 backdrop-blur-md transition-colors`}>
        <div className="w-full flex justify-between items-center md:w-auto">
          <div className="flex items-center gap-3 md:gap-4">
            <ShieldAlert className="h-8 w-8 md:h-10 md:w-10" />
            <div>
              <h1 className="text-sm md:text-xl tracking-widest uppercase font-bold">Command Center</h1>
              <p className={`text-[10px] md:text-xs uppercase ${theme.subtext}`}>System Integrity: Nominal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded border ${theme.border}`}>
               {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-2 rounded border ${theme.border}`}>
               <Menu size={20} />
            </button>
          </div>
        </div>

        <div className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row w-full md:w-auto gap-4 mt-4 md:mt-0`}>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`hidden md:block p-2 rounded border hover:opacity-80 transition ${theme.border}`}>
             {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
          <button onClick={() => setIsAuth(false)} className={`flex items-center justify-center gap-2 px-4 py-2 rounded border text-xs md:text-sm font-bold transition-colors ${theme.buttonDestructive}`}>
            <LogOut size={14}/> LOCK SESSION
          </button>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* TABS */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-8">
          <button onClick={() => setActiveTab('parents')} className={`flex-1 md:flex-none px-6 py-3 md:py-2 rounded border transition-all duration-300 flex items-center justify-center gap-2 text-xs md:text-sm font-bold ${activeTab === 'parents' ? theme.tabActive : theme.tabInactive}`}>
            <UserCheck size={16}/> PARENT PRIVACY
          </button>
          <button onClick={() => setActiveTab('admins')} className={`flex-1 md:flex-none px-6 py-3 md:py-2 rounded border transition-all duration-300 flex items-center justify-center gap-2 text-xs md:text-sm font-bold ${activeTab === 'admins' ? theme.tabActive : theme.tabInactive}`}>
            <Key size={16}/> ADMIN CREDENTIALS
          </button>
          <button onClick={() => setActiveTab('create')} className={`flex-1 md:flex-none px-6 py-3 md:py-2 rounded border transition-all duration-300 flex items-center justify-center gap-2 text-xs md:text-sm font-bold ${activeTab === 'create' ? theme.tabActive : theme.tabInactive}`}>
            <UserPlus size={16}/> USER MANAGEMENT
          </button>
        </div>

        {/* --- TAB: PARENT DIRECTORY --- */}
        {activeTab === 'parents' && (
          <div className={`border ${theme.border} rounded-xl p-4 md:p-6 ${theme.cardBg} transition-colors`}>
            {/* TOOLBAR */}
            <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 border-b ${theme.border} pb-4 gap-4`}>
               <h2 className={`text-sm md:text-lg flex items-center gap-2 ${theme.accent}`}><UserCheck size={18} /> PARENT DIRECTORY ACCESS</h2>
               
               <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                  {/* SEARCH BAR */}
                  <div className="relative w-full md:w-64">
                    <input 
                      className={`w-full pl-9 pr-4 py-2 border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-current ${theme.inputBg}`}
                      placeholder="Search ID / Mobile..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search size={14} className={`absolute left-3 top-2.5 ${theme.subtext}`}/>
                  </div>

                  {/* BULK ACTIONS */}
                  <div className="flex gap-2 w-full md:w-auto">
                      <button onClick={() => toggleAllVisibility(true)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 border px-3 py-2 rounded text-xs font-bold transition-all ${theme.buttonPrimary}`}>
                        <CheckCircle size={14} /> GRANT ALL
                      </button>
                      <button onClick={() => toggleAllVisibility(false)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 border px-3 py-2 rounded text-xs font-bold transition-all ${theme.buttonDestructive}`}>
                        <XCircle size={14} /> REVOKE ALL
                      </button>
                  </div>
               </div>
            </div>

            {/* LIST */}
            <div className="grid gap-4">
              {paginatedParents.length === 0 ? (
                <div className={`text-center py-10 ${theme.subtext}`}>NO RECORDS MATCH YOUR SEARCH</div>
              ) : (
                paginatedParents.map(p => (
                  <div key={p.id} className={`flex flex-col md:flex-row justify-between items-start md:items-center border ${theme.border} p-4 rounded-lg transition-colors ${theme.rowHover}`}>
                    <div className="mb-3 md:mb-0 w-full md:w-auto">
                      <div className={`font-bold text-sm md:text-base flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                         {p.parentId}
                         {p.isVisible && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse md:hidden"></span>}
                      </div>
                      <div className={`text-xs mt-1 flex flex-col md:flex-row gap-1 md:gap-3 ${theme.subtext}`}>
                         <span>Children: <span className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>{p.childrenCount}</span></span>
                         <span className={`hidden md:inline ${isDarkMode ? 'text-green-900' : 'text-slate-300'}`}>|</span>
                         <span className="font-mono">Mobile: {p.mobile}</span>
                      </div>
                    </div>
                    
                    <div className={`flex w-full md:w-auto items-center justify-between gap-4 border-t md:border-0 pt-3 md:pt-0 mt-2 md:mt-0 ${theme.border}`}>
                      <span className={`text-[10px] md:text-xs uppercase font-bold tracking-wider ${p.isVisible ? 'text-red-500' : theme.subtext}`}>
                        {p.isVisible ? 'VISIBLE' : 'MASKED'}
                      </span>
                      <button 
                        onClick={() => toggleVisibility(p.id, p.isVisible)}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded text-xs font-bold border transition-all ${p.isVisible ? theme.buttonDestructive : theme.buttonPrimary}`}
                      >
                        {p.isVisible ? <><EyeOff size={14}/> REVOKE</> : <><Eye size={14}/> GRANT</>}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className={`mt-6 pt-4 border-t ${theme.border} flex justify-between items-center text-xs ${theme.subtext}`}>
                <span>Page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`p-2 rounded border disabled:opacity-50 transition-colors ${theme.paginationBtn}`}><ChevronLeft size={16}/></button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`p-2 rounded border disabled:opacity-50 transition-colors ${theme.paginationBtn}`}><ChevronRight size={16}/></button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB: ADMIN CREDENTIALS --- */}
        {activeTab === 'admins' && (
          <div className={`border ${theme.border} rounded-xl p-4 md:p-6 ${theme.cardBg}`}>
            <h2 className={`text-sm md:text-lg mb-6 flex items-center gap-2 border-b pb-2 ${theme.accent} ${theme.border}`}><Key size={18} /> ADMINISTRATIVE CREDENTIALS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {admins.map(a => (
                <div key={a.id} className={`border p-5 rounded-lg transition-colors ${theme.border} ${isDarkMode ? 'bg-green-900/5 hover:bg-green-900/10' : 'bg-slate-50 hover:bg-slate-100'}`}>
                  <div className="flex justify-between mb-4 items-center">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${isDarkMode ? 'bg-green-900/20 text-gray-400' : 'bg-blue-100 text-blue-700'}`}>{a.role}</span>
                    {a.isActive ? <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div> : <div className="h-2 w-2 rounded-full bg-red-500"></div>}
                  </div>
                  <div className="mb-3">
                    <label className={`text-[10px] uppercase block mb-1 ${theme.subtext}`}>Username</label>
                    <div className={`text-base md:text-lg font-bold tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{a.username}</div>
                  </div>
                  <div>
                    <label className={`text-[10px] uppercase block mb-1 ${theme.subtext}`}>Decrypted Password</label>
                    <div className={`font-mono text-sm md:text-base tracking-wider p-2 rounded border ${isDarkMode ? 'text-red-400 bg-red-900/10 border-red-900/30' : 'text-red-600 bg-red-50 border-red-100'}`}>
                      {a.visiblePassword || 'ENCRYPTED_ONLY'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB: USER MANAGEMENT (NEW) --- */}
        {activeTab === 'create' && (
          <div className={`border ${theme.border} rounded-xl p-6 ${theme.cardBg} max-w-xl mx-auto`}>
            <h2 className={`text-lg mb-6 flex items-center gap-2 border-b pb-2 ${theme.border} ${theme.accent}`}><UserPlus size={18} /> CREATE NEW SYSTEM USER</h2>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className={`text-xs uppercase block mb-1 ${theme.subtext}`}>Role Assignment</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`border rounded p-3 cursor-pointer flex items-center gap-2 ${newAdmin.role === 'TEACHER' ? theme.tabActive : theme.tabInactive}`}>
                    <input type="radio" name="role" checked={newAdmin.role === 'TEACHER'} onChange={() => setNewAdmin({...newAdmin, role: 'TEACHER'})} className="hidden" />
                    <Server size={16}/> ACADEMIC ADMIN
                  </label>
                  <label className={`border rounded p-3 cursor-pointer flex items-center gap-2 ${newAdmin.role === 'SUPER_ADMIN' ? theme.tabActive : theme.tabInactive}`}>
                    <input type="radio" name="role" checked={newAdmin.role === 'SUPER_ADMIN'} onChange={() => setNewAdmin({...newAdmin, role: 'SUPER_ADMIN'})} className="hidden" />
                    <ShieldAlert size={16}/> DIRECTOR CONSOLE
                  </label>
                </div>
              </div>
              <div>
                <label className={`text-xs uppercase block mb-1 ${theme.subtext}`}>Username / ID</label>
                <input className={`w-full p-3 border rounded ${theme.inputBg}`} placeholder="e.g. academic_head_01" value={newAdmin.username} onChange={e=>setNewAdmin({...newAdmin, username: e.target.value})} required/>
              </div>
              <div>
                <label className={`text-xs uppercase block mb-1 ${theme.subtext}`}>Password</label>
                <input className={`w-full p-3 border rounded ${theme.inputBg}`} placeholder="Assign Strong Password" value={newAdmin.password} onChange={e=>setNewAdmin({...newAdmin, password: e.target.value})} required/>
              </div>
              <button className={`w-full py-3 rounded font-bold transition-all active:scale-95 ${theme.buttonPrimary}`}>CREATE USER</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}