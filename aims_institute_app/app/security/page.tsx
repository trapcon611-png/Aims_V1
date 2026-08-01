'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Lock, Eye, EyeOff, Search, UserCheck, Key, 
  Menu, LogOut, CheckCircle, XCircle, UserPlus, Sun, Moon, 
  ChevronLeft, ChevronRight, Server, Activity, Terminal, 
  AlertTriangle, Clock, Smartphone, Globe, DownloadCloud,
  FileSignature, Check, X
} from 'lucide-react';

// --- SMART API RESOLVER ---
const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3001`;
    return 'http://localhost:3001';
};

const API_URL = getApiUrl();

export default function SecurityPanel() {
  const [isAuth, setIsAuth] = useState(false);
  const [token, setToken] = useState(''); 
  const [creds, setCreds] = useState({ id: '', pass: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  const [admins, setAdmins] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]); 
  const [feeRequests, setFeeRequests] = useState<any[]>([]); 
  
  const [activeTab, setActiveTab] = useState<'audit' | 'parents' | 'admins' | 'create' | 'finance'>('audit');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // ✨ NEW: Light/Dark Theme State
  const [isDarkMode, setIsDarkMode] = useState(true); 
  
  // Parents Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // ✨ NEW: Audit Logs Pagination
  const [auditPage, setAuditPage] = useState(1);
  const AUDIT_ITEMS_PER_PAGE = 15;

  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', role: 'TEACHER' });

  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
      const isAlreadyInstalled = localStorage.getItem('aims_soc_installed') === 'true';
      if (!isAlreadyInstalled) setShowInstallBanner(true);

      const handleBeforeInstallPrompt = (e: any) => {
          e.preventDefault();
          setDeferredPrompt(e);
          if (!isAlreadyInstalled) setShowInstallBanner(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', () => {
          localStorage.setItem('aims_soc_installed', 'true');
          setShowInstallBanner(false);
          setDeferredPrompt(null);
      });

      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
      if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
              localStorage.setItem('aims_soc_installed', 'true');
              setShowInstallBanner(false);
          }
          setDeferredPrompt(null);
      } else {
          alert("To install: Click your browser's menu button and select 'Add to Home Screen' or 'Install App'.");
      }
  };

  const handleAlreadyInstalledClick = () => {
      localStorage.setItem('aims_soc_installed', 'true');
      setShowInstallBanner(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: creds.id, password: creds.pass })
      });

      if (!res.ok) throw new Error("Invalid Security Clearance");

      const data = await res.json();
      const authToken = data.access_token || data.token || data.accessToken;
      
      if (!authToken) throw new Error("Authentication failed: No token received.");
      
      setToken(authToken);
      setIsAuth(true);
      fetchData(authToken); 
    } catch (error: any) {
      alert("Access Denied: " + error.message);
    }
  };

  const fetchData = async (currentToken = token) => {
    if (!currentToken) return;
    try {
        const headers = { 'Authorization': `Bearer ${currentToken}` };

        const adminsRes = await fetch(`${API_URL}/erp/security/admins`, { headers });
        if(adminsRes.ok) setAdmins(await adminsRes.json());

        const parentsRes = await fetch(`${API_URL}/erp/security/directory`, { headers });
        if(parentsRes.ok) setParents(await parentsRes.json());

        const logsRes = await fetch(`${API_URL}/erp/security/logs?limit=200`, { headers });
        if(logsRes.ok) setSecurityLogs(await logsRes.json());

        const feeReqRes = await fetch(`${API_URL}/erp/security/fee-requests`, { headers });
        if(feeReqRes.ok) setFeeRequests(await feeReqRes.json());

    } catch (error: any) {
        console.error("Network connection to backend failed:", error);
    }
  };

  useEffect(() => {
      if (isAuth && (activeTab === 'audit' || activeTab === 'finance')) {
          const interval = setInterval(() => fetchData(), 30000);
          return () => clearInterval(interval);
      }
  }, [isAuth, activeTab]);

  const toggleVisibility = async (parentId: string, currentStatus: boolean) => {
    try {
        const res = await fetch(`${API_URL}/erp/security/mobile-visibility`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ parentId, isVisible: !currentStatus })
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        fetchData(); 
    } catch (e: any) { alert(`Failed to update visibility: ${e.message}`); }
  };

  const toggleAllVisibility = async (status: boolean) => {
    if(!confirm(`Security Alert:\n\nAre you sure you want to ${status ? 'UNMASK' : 'MASK'} all parent mobile numbers for the Director?`)) return;
    try {
        const res = await fetch(`${API_URL}/erp/security/mobile-visibility/all`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ isVisible: status })
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        fetchData();
    } catch (e: any) { alert(`Failed to execute bulk update: ${e.message}`); }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/erp/security/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newAdmin)
      });
      
      if(res.ok) {
        alert("System User Created Successfully");
        setNewAdmin({ username: '', password: '', role: 'TEACHER' });
        fetchData();
      } else {
        const errorText = await res.text();
        alert(`Failed to create user. Server response: ${res.status}\n${errorText}`);
      }
    } catch (e: any) { alert(`Network Error: ${e.message}`); }
  };

  const handleResolvePoolAccess = async (actorId: string, status: 'APPROVED' | 'REJECTED') => {
      const isUnlocking = status === 'APPROVED';
      if (!confirm(`Are you sure you want to ${isUnlocking ? 'UNLOCK' : 'LOCK'} the Financial Pool?`)) return;
      
      try {
          const res = await fetch(`${API_URL}/erp/security/pool-status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ status: isUnlocking })
          });
          if (!res.ok) throw new Error('Failed to update pool status');
          alert(`Financial Pool ${isUnlocking ? 'UNLOCKED' : 'LOCKED'} successfully.`);
          fetchData();
      } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const handleResolveFeeRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!confirm(`Are you sure you want to ${status} this edit request?`)) return;
    try {
        const res = await fetch(`${API_URL}/erp/security/fee-requests/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error('Failed to resolve request');
        fetchData();
        alert(`Request ${status} successfully.`);
    } catch (e: any) { alert(`Error resolving request: ${e.message}`); }
  };

  // Pagination Logic
  const filteredParents = parents.filter(p => 
    (p.parentId && p.parentId.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (p.mobile && p.mobile.includes(searchQuery))
  );
  const paginatedParents = filteredParents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredParents.length / ITEMS_PER_PAGE);
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const totalAuditPages = Math.ceil(securityLogs.length / AUDIT_ITEMS_PER_PAGE);
  const paginatedLogs = securityLogs.slice((auditPage - 1) * AUDIT_ITEMS_PER_PAGE, auditPage * AUDIT_ITEMS_PER_PAGE);
  useEffect(() => { setAuditPage(1); }, [activeTab]);

  // ✨ COMPREHENSIVE DYNAMIC THEME ENGINE
  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-slate-50',
    text: isDarkMode ? 'text-green-500' : 'text-slate-700',
    textStrong: isDarkMode ? 'text-white' : 'text-slate-900',
    border: isDarkMode ? 'border-green-900/50' : 'border-slate-200',
    cardBg: isDarkMode ? 'bg-[#0f0f0f]' : 'bg-white',
    cardInnerBg: isDarkMode ? 'bg-black/40' : 'bg-slate-50',
    inputBg: isDarkMode ? 'bg-black border-green-900/50 text-green-400 focus:border-green-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500',
    headerBg: isDarkMode ? 'bg-[#0a0a0a]/90' : 'bg-white/90',
    
    buttonPrimary: isDarkMode ? 'bg-green-900/20 text-green-400 border border-green-900/50 hover:bg-green-900/40' : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700',
    buttonDestructive: isDarkMode ? 'bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
    buttonOutline: isDarkMode ? 'border-gray-800 text-gray-400 hover:bg-gray-900/60' : 'border-slate-300 text-slate-600 hover:bg-slate-100',
    
    accent: isDarkMode ? 'text-green-400' : 'text-blue-600',
    accentDot: isDarkMode ? 'bg-green-500' : 'bg-blue-600',
    subtext: isDarkMode ? 'text-gray-500' : 'text-slate-500',
    rowHover: isDarkMode ? 'hover:bg-green-900/10' : 'hover:bg-slate-50 shadow-sm hover:shadow transition-shadow',
    
    tabActive: isDarkMode ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm',
    tabInactive: isDarkMode ? 'border-green-900/50 text-gray-500 hover:text-green-400' : 'border-slate-200 text-slate-500 hover:bg-slate-50',
    paginationBtn: isDarkMode ? 'bg-black border-green-900 text-green-500 hover:bg-green-900/20' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50',
    
    tableHead: isDarkMode ? 'bg-black/80 border-green-900/30 text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-600',
    tableDivider: isDarkMode ? 'divide-green-900/20' : 'divide-slate-100',
    
    badgeDanger: isDarkMode ? 'bg-red-950/50 text-red-400 border-red-900/50' : 'bg-red-50 text-red-600 border-red-200',
    badgeWarning: isDarkMode ? 'bg-orange-950/50 text-orange-400 border-orange-900/50' : 'bg-orange-50 text-orange-600 border-orange-200',
    badgeSuccess: isDarkMode ? 'bg-green-950/50 text-green-400 border-green-900/50' : 'bg-emerald-50 text-emerald-600 border-emerald-200',
    badgePurple: isDarkMode ? 'bg-purple-950/50 text-purple-400 border-purple-900/50' : 'bg-purple-50 text-purple-600 border-purple-200'
  };

  const getLogBadge = (action: string) => {
      if (action.includes('FAILED') || action.includes('REJECTED')) return <span className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 border ${theme.badgeDanger}`}><AlertTriangle size={10}/> {action}</span>;
      if (action.includes('MASTER') || action.includes('REQUESTED')) return <span className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 border ${theme.badgePurple}`}><ShieldAlert size={10}/> {action}</span>;
      return <span className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 border ${theme.badgeSuccess}`}><CheckCircle size={10}/> {action}</span>;
  };

  if (!isAuth) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${theme.bg}`}>
        <div className={`w-full max-w-sm border ${theme.border} ${theme.cardBg} p-6 md:p-8 rounded-2xl shadow-xl transition-colors duration-300`}>
          <div className="flex justify-center mb-6">
            <ShieldAlert className={`h-14 w-14 md:h-16 md:w-16 animate-pulse ${theme.accent}`} />
          </div>
          <h1 className={`text-xl md:text-2xl font-mono text-center mb-2 uppercase tracking-widest ${theme.textStrong}`}>SOC Terminal</h1>
          <p className={`text-xs text-center font-mono mb-8 ${theme.subtext}`}>UNAUTHORIZED ACCESS PROHIBITED</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              className={`w-full border p-3 rounded font-mono focus:outline-none transition-colors ${theme.inputBg}`} 
              placeholder="AGENT ID" 
              value={creds.id} onChange={e=>setCreds({...creds, id:e.target.value})} 
            />
            <div className="relative">
              <input 
                className={`w-full border p-3 rounded font-mono focus:outline-none transition-colors pr-10 ${theme.inputBg}`} 
                type={showPassword ? "text" : "password"} 
                placeholder="ACCESS KEY" 
                value={creds.pass} onChange={e=>setCreds({...creds, pass:e.target.value})} 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-3 top-3.5 ${theme.subtext} hover:${theme.accent} transition-colors focus:outline-none`}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button className={`w-full py-3 rounded font-mono font-bold transition-all active:scale-95 shadow-md ${theme.buttonPrimary}`}>AUTHENTICATE</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-mono pb-10 transition-colors duration-300 ${theme.bg} ${theme.text}`}>
      <header className={`flex flex-col md:flex-row justify-between items-center p-4 md:p-6 border-b ${theme.border} ${theme.headerBg} sticky top-0 z-50 backdrop-blur-md transition-colors`}>
        <div className="w-full flex justify-between items-center md:w-auto">
          <div className="flex items-center gap-3 md:gap-4">
            <ShieldAlert className={`h-8 w-8 md:h-10 md:w-10 ${theme.accent}`} />
            <div>
              <h1 className={`text-sm md:text-xl tracking-widest uppercase font-bold ${theme.textStrong}`}>Director SOC</h1>
              <p className={`text-[10px] md:text-xs uppercase flex items-center gap-1.5 ${theme.accent}`}><span className={`h-2 w-2 rounded-full animate-pulse inline-block ${theme.accentDot}`}></span> System Integrity: Nominal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded border ${theme.border} ${theme.accent}`}>
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-2 rounded border ${theme.border} ${theme.accent}`}>
               <Menu size={20} />
            </button>
          </div>
        </div>

        <div className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row w-full md:w-auto gap-3 mt-4 md:mt-0`}>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`hidden md:flex items-center justify-center gap-2 p-2.5 rounded border transition-colors ${theme.buttonOutline}`} title="Toggle Theme">
             {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => { setIsAuth(false); setToken(''); }} className={`flex items-center justify-center gap-2 px-4 py-2 rounded text-xs md:text-sm font-bold transition-all shadow-sm ${theme.buttonDestructive}`}>
            <LogOut size={14}/> LOCK SESSION
          </button>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        
        {/* PWA ALERT BANNER */}
        {showInstallBanner && (
          <div className={`mb-8 p-5 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${theme.border} ${theme.cardBg} shadow-lg`}>
             <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg border ${theme.border} ${theme.cardInnerBg}`}>
                    <DownloadCloud className={theme.accent} size={24} />
                </div>
                <div>
                   <h3 className={`font-bold ${theme.accent} tracking-wider text-xs md:text-sm`}>SYSTEM DEPLOYMENT ADVANTAGE</h3>
                   <p className={`text-xs mt-1 ${theme.subtext}`}>Run the Director SOC Terminal as an isolated hardware app container. Removes browser URL constraints and improves logging speeds.</p>
                </div>
             </div>
             <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto mt-2 md:mt-0">
                <button 
                   onClick={handleAlreadyInstalledClick} 
                   className={`px-4 py-2.5 rounded text-xs font-bold transition-colors flex-1 md:flex-none whitespace-nowrap border ${theme.buttonOutline}`}
                >
                   ALREADY INSTALLED
                </button>
                <button 
                   onClick={handleInstallClick} 
                   className={`px-5 py-2.5 rounded text-xs font-bold tracking-wider flex-1 md:flex-none whitespace-nowrap shadow-md ${theme.buttonPrimary}`}
                >
                   INSTALL NOW
                </button>
             </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-8 overflow-x-auto pb-2 custom-scrollbar">
          <button onClick={() => setActiveTab('audit')} className={`shrink-0 px-6 py-3 md:py-2 rounded border transition-all duration-300 flex items-center justify-center gap-2 text-xs md:text-sm font-bold ${activeTab === 'audit' ? theme.tabActive : theme.tabInactive}`}>
            <Activity size={16}/> LIVE AUDIT
          </button>
          
          <button onClick={() => setActiveTab('finance')} className={`relative shrink-0 px-6 py-3 md:py-2 rounded border transition-all duration-300 flex items-center justify-center gap-2 text-xs md:text-sm font-bold ${activeTab === 'finance' ? theme.tabActive : theme.tabInactive}`}>
            <FileSignature size={16}/> FINANCE APPROVALS
            {feeRequests.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-bounce shadow-md">
                    {feeRequests.length}
                </span>
            )}
          </button>
          
          <button onClick={() => setActiveTab('parents')} className={`shrink-0 px-6 py-3 md:py-2 rounded border transition-all duration-300 flex items-center justify-center gap-2 text-xs md:text-sm font-bold ${activeTab === 'parents' ? theme.tabActive : theme.tabInactive}`}>
            <UserCheck size={16}/> PARENT PRIVACY
          </button>
          <button onClick={() => setActiveTab('admins')} className={`shrink-0 px-6 py-3 md:py-2 rounded border transition-all duration-300 flex items-center justify-center gap-2 text-xs md:text-sm font-bold ${activeTab === 'admins' ? theme.tabActive : theme.tabInactive}`}>
            <Key size={16}/> ADMIN CREDS
          </button>
          <button onClick={() => setActiveTab('create')} className={`shrink-0 px-6 py-3 md:py-2 rounded border transition-all duration-300 flex items-center justify-center gap-2 text-xs md:text-sm font-bold ${activeTab === 'create' ? theme.tabActive : theme.tabInactive}`}>
            <UserPlus size={16}/> CREATE USER
          </button>
        </div>

        {/* 1. LIVE AUDIT */}
        {activeTab === 'audit' && (
          <div className={`border ${theme.border} rounded-xl p-0 overflow-hidden ${theme.cardBg} shadow-lg`}>
             <div className={`${theme.tableHead} p-4 border-b ${theme.border} flex justify-between items-center`}>
                <h2 className={`text-sm md:text-lg flex items-center gap-2 font-bold ${theme.accent}`}><Terminal size={18} /> NETWORK TRAFFIC LOGS</h2>
                <div className={`flex items-center gap-2 text-xs font-bold ${theme.subtext}`}>
                    <Activity size={14} className={`animate-pulse ${theme.accent}`}/> Live Feed
                </div>
             </div>
             
             <div className="overflow-x-auto min-h-[400px]">
                 <table className="w-full text-left border-collapse text-xs md:text-sm">
                     <thead className={`${theme.tableHead} ${theme.subtext} uppercase text-[10px] md:text-xs tracking-wider border-b ${theme.border}`}>
                         <tr>
                             <th className="p-4 font-bold">Timestamp (IST)</th>
                             <th className="p-4 font-bold">Actor</th>
                             <th className="p-4 font-bold">Event Signature</th>
                             <th className="p-4 font-bold hidden md:table-cell">Origin Node</th>
                         </tr>
                     </thead>
                     <tbody className={`${theme.tableDivider}`}>
                         {paginatedLogs.length === 0 ? (
                             <tr><td colSpan={4} className={`p-10 text-center ${theme.subtext} italic`}>No signals intercepted.</td></tr>
                         ) : (
                             paginatedLogs.map((log) => (
                                 <tr key={log.id} className={`transition-colors group ${theme.rowHover} border-b ${theme.border} last:border-0`}>
                                     <td className="p-4 whitespace-nowrap">
                                        <div className={`flex items-center gap-2 ${theme.subtext}`}>
                                            <Clock size={12} className="opacity-70"/>
                                            {new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                                        </div>
                                     </td>
                                     <td className={`p-4 font-bold ${theme.textStrong}`}>
                                        {log.actorId} <span className={`text-[10px] ${theme.subtext} font-normal ml-2 hidden sm:inline-block border px-1.5 py-0.5 rounded ${theme.border}`}>({log.role})</span>
                                     </td>
                                     <td className="p-4">
                                        {getLogBadge(log.action)}
                                     </td>
                                     <td className={`p-4 hidden md:table-cell ${theme.subtext}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1 bg-black/5 px-2 py-0.5 rounded" title="IP Address"><Globe size={12}/> {log.ipAddress}</span>
                                            <span className="flex items-center gap-1 bg-black/5 px-2 py-0.5 rounded max-w-[150px] truncate" title={log.userAgent}><Smartphone size={12}/> {log.userAgent?.split(' ')[0] || 'Unknown'}</span>
                                        </div>
                                     </td>
                                 </tr>
                             ))
                         )}
                     </tbody>
                 </table>
             </div>

             {/* Audit Pagination */}
             {totalAuditPages > 1 && (
               <div className={`p-4 border-t ${theme.border} ${theme.tableHead} flex justify-between items-center text-xs ${theme.subtext}`}>
                 <span className="font-bold">Page {auditPage} of {totalAuditPages}</span>
                 <div className="flex gap-2">
                   <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1} className={`p-2 rounded border disabled:opacity-50 transition-colors ${theme.paginationBtn}`}><ChevronLeft size={16}/></button>
                   <button onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))} disabled={auditPage === totalAuditPages} className={`p-2 rounded border disabled:opacity-50 transition-colors ${theme.paginationBtn}`}><ChevronRight size={16}/></button>
                 </div>
               </div>
             )}
          </div>
        )}

        {/* 2. FINANCE APPROVALS */}
        {activeTab === 'finance' && (
            <div className={`border ${theme.border} rounded-xl p-4 md:p-6 ${theme.cardBg} shadow-lg`}>
                
                <div className={`border ${theme.border} rounded-xl p-4 md:p-6 mb-8 ${theme.cardInnerBg}`}>
                    <h2 className={`text-sm md:text-lg mb-4 flex items-center gap-2 font-bold ${theme.accent}`}>
                        <Lock size={18} /> FINANCIAL POOL MANAGEMENT
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                            onClick={() => handleResolvePoolAccess('SYSTEM_USER', 'APPROVED')}
                            className={`px-5 py-3 rounded text-xs font-bold transition shadow-md flex items-center justify-center gap-2 ${theme.buttonPrimary}`}
                        >
                            <Lock size={16} className="rotate-12"/> UNLOCK FINANCIAL POOL
                        </button>
                        <button 
                            onClick={() => handleResolvePoolAccess('SYSTEM_USER', 'REJECTED')}
                            className={`px-5 py-3 rounded text-xs font-bold transition shadow-md flex items-center justify-center gap-2 ${theme.buttonDestructive}`}
                        >
                            <ShieldAlert size={16}/> LOCK FINANCIAL POOL
                        </button>
                    </div>
                </div>

                <h2 className={`text-sm md:text-lg mb-6 flex items-center gap-2 border-b pb-3 font-bold ${theme.accent} ${theme.border}`}>
                    <FileSignature size={18} /> PENDING RECEIPT EDIT REQUESTS
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {feeRequests.length === 0 ? (
                        <div className={`col-span-full py-12 text-center ${theme.subtext} font-mono tracking-widest uppercase bg-black/5 rounded-xl border border-dashed ${theme.border}`}>
                            <CheckCircle size={36} className="mx-auto mb-3 opacity-40" />
                            No pending financial edit requests.
                        </div>
                    ) : (
                        feeRequests.map(req => (
                            <div key={req.id} className={`border p-5 rounded-xl transition-shadow shadow-sm hover:shadow-md ${theme.border} ${theme.cardBg}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className={`font-bold text-base md:text-lg ${theme.textStrong}`}>{req.studentName}</div>
                                        <div className={`text-xs ${theme.subtext}`}>{req.displayId}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-black text-lg ${theme.accent}`}>₹{req.amount}</div>
                                        <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border mt-1 ${theme.badgeWarning}`}>{req.paymentMode}</div>
                                    </div>
                                </div>
                                <div className={`text-[11px] mb-6 font-mono p-3 rounded-lg border ${theme.border} ${theme.cardInnerBg} ${theme.subtext}`}>
                                    <div className={`flex justify-between border-b pb-1.5 mb-1.5 ${theme.border}`}>
                                        <span>RECEIPT DATE:</span>
                                        <span className={`font-bold ${theme.textStrong}`}>{new Date(req.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className={`flex justify-between border-b pb-1.5 mb-1.5 ${theme.border}`}>
                                        <span>REQUEST DATE:</span>
                                        <span className={`font-bold ${theme.textStrong}`}>{new Date(req.editRequestDate).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>TXN REF:</span>
                                        <span className={`font-bold ${theme.textStrong}`}>{req.transactionId || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleResolveFeeRequest(req.id, 'APPROVED')} 
                                        className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <Check size={14}/> APPROVE
                                    </button>
                                    <button 
                                        onClick={() => handleResolveFeeRequest(req.id, 'REJECTED')} 
                                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <X size={14}/> REJECT
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* 3. PARENT PRIVACY */}
        {activeTab === 'parents' && (
          <div className={`border ${theme.border} rounded-xl p-4 md:p-6 ${theme.cardBg} shadow-lg transition-colors`}>
            <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 border-b ${theme.border} pb-4 gap-4`}>
               <h2 className={`text-sm md:text-lg flex items-center gap-2 font-bold ${theme.accent}`}><UserCheck size={18} /> PARENT DIRECTORY ACCESS</h2>
               <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                  <div className="relative w-full md:w-64">
                    <input 
                      className={`w-full pl-9 pr-4 py-2.5 border rounded text-sm font-mono focus:outline-none transition-colors shadow-sm ${theme.inputBg}`}
                      placeholder="Search ID / Mobile..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search size={16} className={`absolute left-3 top-3 ${theme.subtext}`}/>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                      <button onClick={() => toggleAllVisibility(true)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all shadow-sm ${theme.buttonPrimary}`}>
                        <CheckCircle size={14} /> GRANT ALL
                      </button>
                      <button onClick={() => toggleAllVisibility(false)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all shadow-sm ${theme.buttonDestructive}`}>
                        <XCircle size={14} /> REVOKE ALL
                      </button>
                  </div>
               </div>
            </div>

            <div className="grid gap-4">
              {paginatedParents.length === 0 ? (
                <div className={`text-center py-12 bg-black/5 rounded-xl border border-dashed ${theme.border} ${theme.subtext}`}>NO RECORDS MATCH YOUR SEARCH</div>
              ) : (
                paginatedParents.map(p => (
                  <div key={p.id} className={`flex flex-col md:flex-row justify-between items-start md:items-center border ${theme.border} p-4 rounded-xl transition-all ${theme.rowHover}`}>
                    <div className="mb-3 md:mb-0 w-full md:w-auto">
                      <div className={`font-bold text-sm md:text-base flex items-center gap-2 ${theme.textStrong}`}>
                         {p.parentId}
                         {p.isVisible && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse md:hidden"></span>}
                      </div>
                      <div className={`text-xs mt-1.5 flex flex-col md:flex-row gap-1 md:gap-3 ${theme.subtext}`}>
                         <span className="bg-black/5 px-2 py-0.5 rounded border border-black/5">Children: <strong className={theme.textStrong}>{p.childrenCount}</strong></span>
                         <span className={`hidden md:inline opacity-30`}>|</span>
                         <span className="font-mono bg-black/5 px-2 py-0.5 rounded border border-black/5">Mobile: <strong className={theme.textStrong}>{p.mobile}</strong></span>
                      </div>
                    </div>
                    
                    <div className={`flex w-full md:w-auto items-center justify-between gap-4 border-t md:border-0 pt-3 md:pt-0 mt-2 md:mt-0 ${theme.border}`}>
                      <span className={`text-[10px] md:text-xs uppercase font-bold tracking-wider px-2 py-1 rounded border ${p.isVisible ? theme.badgeDanger : theme.badgeSuccess}`}>
                        {p.isVisible ? 'VISIBLE' : 'MASKED'}
                      </span>
                      <button 
                        onClick={() => toggleVisibility(p.id, p.isVisible)}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded text-xs font-bold border transition-all shadow-sm ${p.isVisible ? theme.buttonDestructive : theme.buttonPrimary}`}
                      >
                        {p.isVisible ? <><EyeOff size={14}/> REVOKE</> : <><Eye size={14}/> GRANT</>}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className={`mt-6 pt-4 border-t ${theme.border} flex justify-between items-center text-xs font-bold ${theme.subtext}`}>
                <span>Page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`p-2 rounded border disabled:opacity-50 transition-colors shadow-sm ${theme.paginationBtn}`}><ChevronLeft size={16}/></button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`p-2 rounded border disabled:opacity-50 transition-colors shadow-sm ${theme.paginationBtn}`}><ChevronRight size={16}/></button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. ADMIN CREDS */}
        {activeTab === 'admins' && (
          <div className={`border ${theme.border} rounded-xl p-4 md:p-6 ${theme.cardBg} shadow-lg`}>
            <h2 className={`text-sm md:text-lg mb-6 flex items-center gap-2 border-b pb-3 font-bold ${theme.accent} ${theme.border}`}><Key size={18} /> ADMINISTRATIVE CREDENTIALS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {admins.map(a => (
                <div key={a.id} className={`border p-5 rounded-xl transition-shadow shadow-sm hover:shadow-md ${theme.border} ${theme.cardInnerBg}`}>
                  <div className="flex justify-between mb-4 items-center border-b pb-3 border-black/5">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${theme.border} ${theme.subtext}`}>{a.role}</span>
                    {a.isActive ? <div className={`h-2.5 w-2.5 rounded-full ${theme.accentDot} shadow-sm`}></div> : <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>}
                  </div>
                  <div className="mb-4">
                    <label className={`text-[10px] uppercase block mb-1 font-bold ${theme.subtext}`}>Username</label>
                    <div className={`text-base md:text-lg font-bold tracking-wide ${theme.textStrong}`}>{a.username}</div>
                  </div>
                  <div>
                    <label className={`text-[10px] uppercase block mb-1 font-bold ${theme.subtext}`}>Decrypted Password</label>
                    <div className={`font-mono text-sm md:text-base tracking-wider p-2.5 rounded border ${isDarkMode ? 'text-red-400 bg-red-900/10 border-red-900/30' : 'text-red-700 bg-red-50 border-red-200'}`}>
                      {a.visiblePassword || 'ENCRYPTED_ONLY'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. CREATE USER */}
        {activeTab === 'create' && (
          <div className={`border ${theme.border} rounded-xl p-6 ${theme.cardBg} max-w-xl mx-auto shadow-xl`}>
            <h2 className={`text-lg mb-6 flex items-center gap-2 border-b pb-3 font-bold ${theme.border} ${theme.accent}`}><UserPlus size={18} /> CREATE NEW SYSTEM USER</h2>
            <form onSubmit={handleCreateAdmin} className="space-y-5">
              <div>
                <label className={`text-xs uppercase block mb-2 font-bold ${theme.subtext}`}>Role Assignment</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`border rounded-lg p-4 cursor-pointer flex items-center gap-2 transition-all shadow-sm ${newAdmin.role === 'TEACHER' ? theme.tabActive : theme.tabInactive}`}>
                    <input type="radio" name="role" checked={newAdmin.role === 'TEACHER'} onChange={() => setNewAdmin({...newAdmin, role: 'TEACHER'})} className="hidden" />
                    <Server size={18}/> <span className="font-bold text-xs">ACADEMIC ADMIN</span>
                  </label>
                  <label className={`border rounded-lg p-4 cursor-pointer flex items-center gap-2 transition-all shadow-sm ${newAdmin.role === 'SUPER_ADMIN' ? theme.tabActive : theme.tabInactive}`}>
                    <input type="radio" name="role" checked={newAdmin.role === 'SUPER_ADMIN'} onChange={() => setNewAdmin({...newAdmin, role: 'SUPER_ADMIN'})} className="hidden" />
                    <ShieldAlert size={18}/> <span className="font-bold text-xs">DIRECTOR CONSOLE</span>
                  </label>
                </div>
              </div>
              <div>
                <label className={`text-xs uppercase block mb-1.5 font-bold ${theme.subtext}`}>Username / ID</label>
                <input className={`w-full p-3.5 border rounded-lg shadow-sm ${theme.inputBg}`} placeholder="e.g. academic_head_01" value={newAdmin.username} onChange={e=>setNewAdmin({...newAdmin, username: e.target.value})} required/>
              </div>
              <div>
                <label className={`text-xs uppercase block mb-1.5 font-bold ${theme.subtext}`}>Password</label>
                <input className={`w-full p-3.5 border rounded-lg shadow-sm ${theme.inputBg}`} placeholder="Assign Strong Password" value={newAdmin.password} onChange={e=>setNewAdmin({...newAdmin, password: e.target.value})} required/>
              </div>
              <button className={`w-full py-4 mt-2 rounded-lg font-bold transition-all active:scale-95 shadow-md ${theme.buttonPrimary}`}>CREATE USER ACCOUNT</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}