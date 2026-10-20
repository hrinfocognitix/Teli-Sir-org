import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Clock,
  IndianRupee,
  MessageSquare,
  Plus,
  FileSpreadsheet,
  Search,
  Filter,
  Trash2,
  Edit,
  Send,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  User,
  Eye,
  EyeOff,
  LogOut,
  ChevronRight,
  X,
  FileText,
  Building,
  Mail,
  Phone,
  ShieldAlert,
  BellRing,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { api } from './api';

function getRelativeDateStr(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

function getDateAfterMonths(months) {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth() + months, 1);
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(today.getDate(), lastDayOfTargetMonth));

  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- COLOR MATRIX & URGENCY LOGIC ---
function calculateDueStatus(dueDateStr, paymentStatus) {
  if (paymentStatus === 'Paid') {
    return {
      category: 'PAID',
      daysDiff: 999,
      label: 'Paid / Settled',
      bgBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      rowClass: 'bg-emerald-50/20'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const daysDiff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));

  if (daysDiff < 0) {
    return {
      category: 'OVERDUE',
      daysDiff,
      label: `🔴 Overdue (${Math.abs(daysDiff)}d ago)`,
      bgBadge: 'bg-red-100 text-red-800 border-red-300 font-bold',
      rowClass: 'bg-red-50/70 border-l-4 border-l-red-600'
    };
  } else if (daysDiff <= 2) {
    return {
      category: 'EXTREMELY_URGENT',
      daysDiff,
      label: daysDiff === 0 ? '🟠 Due Today' : `🟠 2 Days Left`,
      bgBadge: 'bg-orange-100 text-orange-800 border-orange-300 font-bold',
      rowClass: 'bg-orange-50/60 border-l-4 border-l-orange-500'
    };
  } else if (daysDiff <= 7) {
    return {
      category: 'URGENT',
      daysDiff,
      label: `🟡 1 Week Left (${daysDiff}d)`,
      bgBadge: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
      rowClass: 'bg-amber-50/30 border-l-2 border-l-amber-400'
    };
  } else if (daysDiff <= 15) {
    return {
      category: 'WARNING',
      daysDiff,
      label: `🟡 15 Days Left (${daysDiff}d)`,
      bgBadge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      rowClass: 'bg-yellow-50/20'
    };
  } else if (daysDiff <= 30) {
    return {
      category: 'EARLY',
      daysDiff,
      label: `🔵 1 Month Notice (${daysDiff}d)`,
      bgBadge: 'bg-blue-100 text-blue-800 border-blue-300',
      rowClass: 'bg-blue-50/10'
    };
  } else {
    return {
      category: 'SAFE',
      daysDiff,
      label: `🟢 Clear (${daysDiff}d remaining)`,
      bgBadge: 'bg-slate-100 text-slate-700 border-slate-200',
      rowClass: ''
    };
  }
}

export default function App() {
  // --- STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('maruti_teli_auth') === 'true';
  });

  const [username, setUsername] = useState('marutiteli');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'clients', 'fssai', 'expiring', 'payments', 'whatsapp-log'

  const [clients, setClients] = useState([]);
  const [fssaiRecords, setFssaiRecords] = useState([]);
  const [whatsappLogs, setWhatsappLogs] = useState([]);

  const [showPasswordsMap, setShowPasswordsMap] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const [isFssaiModalOpen, setIsFssaiModalOpen] = useState(false);
  const [editingFssai, setEditingFssai] = useState(null);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    Promise.all([api.getClients(), api.getFssaiRecords(), api.getWhatsappLogs()])
      .then(([clientData, fssaiData, logData]) => {
        if (!isCurrent) return;
        setClients(clientData);
        setFssaiRecords(fssaiData);
        setWhatsappLogs(logData);
      })
      .catch((error) => {
        if (isCurrent) {
          setToast({ message: `Could not load saved records: ${error.message}`, type: 'error' });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- AUTH HANDLERS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await api.login({ username: username.trim(), password: password.trim() });
      if (!result.success) throw new Error(result.message || 'Invalid credentials');
      sessionStorage.setItem('maruti_teli_auth', 'true');
      setIsAuthenticated(true);
      showToast('Successfully logged in to Maruti Teli & Associates Portal', 'success');
    } catch (error) {
      showToast(error.message || 'Please enter valid credentials', 'error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('maruti_teli_auth');
    setIsAuthenticated(false);
  };

  // --- CLIENT CRUD ---
  const handleSaveClient = async (clientData) => {
    try {
      const savedClient = await api.saveClient(clientData);
      setClients(current => clientData.id
        ? current.map(client => client.id === savedClient.id ? savedClient : client)
        : [savedClient, ...current]);
      showToast(clientData.id ? 'Client record updated successfully' : 'New client added successfully', 'success');
    } catch (error) {
      showToast(`Could not save client: ${error.message}`, 'error');
      return;
    }
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm('Are you sure you want to delete this client record?')) {
      try {
        await api.deleteClient(id);
        setClients(current => current.filter(client => client.id !== id));
        showToast('Client record deleted', 'info');
      } catch (error) {
        showToast(`Could not delete client: ${error.message}`, 'error');
      }
    }
  };

  const handleTogglePaymentStatus = async (id) => {
    const client = clients.find(record => record.id === id);
    if (!client) return;
    const paymentStatus = client.paymentStatus === 'Pending'
      ? 'Partial'
      : client.paymentStatus === 'Partial' ? 'Paid' : 'Pending';
    try {
      const savedClient = await api.saveClient({ ...client, paymentStatus });
      setClients(current => current.map(record => record.id === id ? savedClient : record));
    } catch (error) {
      showToast(`Could not update payment status: ${error.message}`, 'error');
    }
  };

  // --- FSSAI CRUD ---
  const handleSaveFssai = async (fssaiData) => {
    try {
      const savedRecord = await api.saveFssaiRecord(fssaiData);
      setFssaiRecords(current => fssaiData.id
        ? current.map(record => record.id === savedRecord.id ? savedRecord : record)
        : [savedRecord, ...current]);
      showToast(fssaiData.id ? 'FSSAI record updated successfully' : 'New FSSAI record added successfully', 'success');
    } catch (error) {
      showToast(`Could not save FSSAI record: ${error.message}`, 'error');
      return;
    }
    setIsFssaiModalOpen(false);
    setEditingFssai(null);
  };

  const handleDeleteFssai = async (id) => {
    if (window.confirm('Are you sure you want to delete this FSSAI record?')) {
      try {
        await api.deleteFssaiRecord(id);
        setFssaiRecords(current => current.filter(record => record.id !== id));
        showToast('FSSAI record deleted', 'info');
      } catch (error) {
        showToast(`Could not delete FSSAI record: ${error.message}`, 'error');
      }
    }
  };

  const toggleFssaiPassword = (id) => {
    setShowPasswordsMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- WHATSAPP DISPATCH LOGIC ---
  const sendWhatsAppReminder = async (client) => {
    try {
      const result = await api.sendWhatsappReminder(client.id);
      setWhatsappLogs(current => [result.log, ...current]);
      showToast(`WhatsApp reminder sent to ${client.name}.`, 'success');
    } catch (error) {
      showToast(`Could not send WhatsApp reminder: ${error.message}`, 'error');
    }
  };

  const handleBatchTriggerReminders = () => {
    const urgentClients = clients.filter(c => {
      if (c.paymentStatus === 'Paid') return false;
      const status = calculateDueStatus(c.dueDate, c.paymentStatus);
      return ['OVERDUE', 'EXTREMELY_URGENT', 'URGENT', 'WARNING', 'EARLY'].includes(status.category);
    });

    if (urgentClients.length === 0) {
      showToast('No urgent reminders required at this time.', 'info');
      return;
    }

    sendWhatsAppReminder(urgentClients[0]);
    showToast(`Triggered WhatsApp notice for ${urgentClients[0].name}. (${urgentClients.length - 1} remaining)`, 'success');
  };

  // --- CSV EXPORT ---
  const exportToCSV = () => {
    if (clients.length === 0) return;
    let csv = "Name,PAN_GST,Phone,Email,Service,DueDate,Amount,PaymentStatus,Notes\n";
    clients.forEach(c => {
      csv += `"${c.name}","${c.pangst || ''}","${c.phone}","${c.email || ''}","${c.service}","${c.dueDate}",${c.amount},"${c.paymentStatus}","${c.notes || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Maruti_Teli_Clients_Summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Client compliance dataset exported to CSV', 'success');
  };

  // --- MEMOIZED CALCULATIONS ---
  const stats = useMemo(() => {
    let total = clients.length;
    let overdue = 0;
    let urgent = 0;
    let dueSoon = 0;
    let pendingAmt = 0;
    let pendingCount = 0;

    clients.forEach(c => {
      const status = calculateDueStatus(c.dueDate, c.paymentStatus);
      if (c.paymentStatus !== 'Paid') {
        pendingAmt += Number(c.amount) || 0;
        pendingCount++;

        if (status.category === 'OVERDUE') overdue++;
        else if (status.category === 'EXTREMELY_URGENT' || status.category === 'URGENT') urgent++;
        else if (status.category === 'WARNING' || status.category === 'EARLY') dueSoon++;
      }
    });

    return { total, overdue, urgent, dueSoon, pendingAmt, pendingCount };
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (c.pangst && c.pangst.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            c.phone.includes(searchQuery);

      if (!matchesSearch) return false;
      if (serviceFilter !== 'ALL' && c.service !== serviceFilter) return false;

      const status = calculateDueStatus(c.dueDate, c.paymentStatus);
      if (urgencyFilter === 'OVERDUE' && status.category !== 'OVERDUE') return false;
      if (urgencyFilter === 'URGENT' && !['OVERDUE', 'EXTREMELY_URGENT', 'URGENT'].includes(status.category)) return false;
      if (urgencyFilter === 'WARNING' && !['WARNING', 'EARLY'].includes(status.category)) return false;
      if (urgencyFilter === 'PAID' && c.paymentStatus !== 'Paid') return false;

      return true;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [clients, searchQuery, serviceFilter, urgencyFilter]);


  // ================= 1. LOGIN SCREEN =================
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 font-sans text-slate-800">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
          <div className="bg-slate-900 text-white p-8 text-center border-b border-slate-800">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 rounded-2xl flex items-center justify-center text-3xl font-black mx-auto mb-3 shadow-lg">
              MT
            </div>
            <h1 className="text-2xl font-black tracking-wide">MARUTI TELI & ASSOCIATES</h1>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mt-1">Tax & Advisory Client Portal</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">User ID / Registration</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-2 text-xs border border-slate-700"
            >
              <span>Sign In to Dashboard</span>
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </button>

            <div className="text-center pt-2">
              <p className="text-[11px] text-slate-500">
                Demo User ID: <span className="font-mono font-bold text-slate-700">maruti_teli</span> | Password: <span className="font-mono font-bold text-slate-700">admin123</span>
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }


  // ================= 2. MAIN DASHBOARD APPLICATION =================
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-800">

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold text-white bg-slate-900 border border-slate-700 animate-bounce">
          <BellRing className="w-4 h-4 text-amber-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 bg-amber-500 text-slate-950 font-black rounded-xl flex items-center justify-center text-xl shadow">
            MT
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-none">MARUTI TELI</h1>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">& Associates</span>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full px-5 py-3 flex items-center gap-3 text-left transition ${activeTab === 'dashboard' ? 'bg-slate-800 text-amber-400 border-l-4 border-amber-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Clock className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className={`w-full px-5 py-3 flex items-center gap-3 text-left transition ${activeTab === 'clients' ? 'bg-slate-800 text-amber-400 border-l-4 border-amber-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users className="w-4 h-4" />
            <span>All Client Records</span>
          </button>

          <button
            onClick={() => setActiveTab('fssai')}
            className={`w-full px-5 py-3 flex items-center justify-between text-left transition ${activeTab === 'fssai' ? 'bg-slate-800 text-amber-400 border-l-4 border-amber-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>FSSAI Certificates</span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full text-[10px]">
              {fssaiRecords.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('expiring')}
            className={`w-full px-5 py-3 flex items-center justify-between text-left transition ${activeTab === 'expiring' ? 'bg-slate-800 text-amber-400 border-l-4 border-amber-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Urgent & Due Soon</span>
            </div>
            <span className="bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px]">
              {stats.overdue + stats.urgent + stats.dueSoon}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`w-full px-5 py-3 flex items-center gap-3 text-left transition ${activeTab === 'payments' ? 'bg-slate-800 text-amber-400 border-l-4 border-amber-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <IndianRupee className="w-4 h-4 text-emerald-400" />
            <span>Payment Tracker</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp-log')}
            className={`w-full px-5 py-3 flex items-center justify-between text-left transition ${activeTab === 'whatsapp-log' ? 'bg-slate-800 text-amber-400 border-l-4 border-amber-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp Log</span>
            </div>
            <span className="bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded-full text-[10px]">
              {whatsappLogs.length}
            </span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-medium">System Online</span>
          </div>
          <button onClick={handleLogout} className="p-1 hover:text-white" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOP BAR */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchTriggerReminders}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2 transition shadow-sm"
              title="Auto trigger WhatsApp alerts for due clients"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trigger Reminders</span>
            </button>

            <button
              onClick={exportToCSV}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={() => { setEditingClient(null); setIsModalOpen(true); }}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Client</span>
            </button>
          </div>
        </header>

        {/* BODY VIEWS */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* VIEW 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Active Clients</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">Compliance Records</p>
                  </div>
                  <div className="w-11 h-11 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between border-l-4 border-l-yellow-500">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expiring (15d - 30d)</p>
                    <h3 className="text-2xl font-black text-yellow-600 mt-1">{stats.dueSoon}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">Advance Notices</p>
                  </div>
                  <div className="w-11 h-11 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between border-l-4 border-l-red-500">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Urgent & Overdue</p>
                    <h3 className="text-2xl font-black text-red-600 mt-1">{stats.overdue + stats.urgent}</h3>
                    <p className="text-[11px] text-red-500 font-bold mt-1">Action Required</p>
                  </div>
                  <div className="w-11 h-11 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between border-l-4 border-l-emerald-500">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Dues</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">₹{stats.pendingAmt.toLocaleString('en-IN')}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">{stats.pendingCount} unpaid invoices</p>
                  </div>
                  <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* COLOR MATRIX LEGEND BAR */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-amber-400 font-bold uppercase text-[10px] tracking-wider">Compliance Urgency Matrix:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> 🔴 Overdue (&lt;0d)
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> 🟠 2 Days
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span> 🟡 1 Week
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span> 🟡 15 Days
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span> 🔵 1 Month
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 🟢 Settled / Paid
                  </span>
                </div>
              </div>

              {/* TABLE CONTAINER */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search client name, PAN/GST, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="ALL">All Services</option>
                      <option value="Income Tax Return (ITR)">Income Tax Return (ITR)</option>
                      <option value="GST Return Filing">GST Return Filing</option>
                      <option value="Tax Audit Report">Tax Audit Report</option>
                      <option value="TDS Quarterly Return">TDS Quarterly Return</option>
                      <option value="ROC Annual Return">ROC Annual Return</option>
                      <option value="Advance Tax Payment">Advance Tax Payment</option>
                    </select>

                    <select
                      value={urgencyFilter}
                      onChange={(e) => setUrgencyFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="ALL">All Urgency</option>
                      <option value="OVERDUE">Overdue Only</option>
                      <option value="URGENT">Urgent (≤7d)</option>
                      <option value="WARNING">Warning (15d - 30d)</option>
                      <option value="PAID">Paid / Clear</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Client Name & Registration</th>
                        <th className="py-3 px-4">Service Category</th>
                        <th className="py-3 px-4">Due Date & Urgency</th>
                        <th className="py-3 px-4">Fee Amount</th>
                        <th className="py-3 px-4 text-center">WhatsApp Alert</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredClients.map(c => {
                        const status = calculateDueStatus(c.dueDate, c.paymentStatus);
                        return (
                          <tr key={c.id} className={`hover:bg-slate-50 transition ${status.rowClass}`}>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{c.name}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>PAN/GST: {c.pangst || 'N/A'}</span>
                                <span>•</span>
                                <span>{c.phone}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg text-[11px] border border-slate-200">
                                {c.service}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800">{c.dueDate}</div>
                              <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] rounded-full border ${status.bgBadge}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">₹{(c.amount || 0).toLocaleString('en-IN')}</div>
                              <span className={`text-[10px] font-bold ${c.paymentStatus === 'Paid' ? 'text-emerald-600' : c.paymentStatus === 'Partial' ? 'text-amber-600' : 'text-red-600'}`}>
                                {c.paymentStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => sendWhatsAppReminder(c)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Send Alert</span>
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right space-x-1">
                              <button onClick={() => { setEditingClient(c); setIsModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteClient(c.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-200 rounded-lg">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: ALL CLIENTS GRID */}
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">Master Client Directory</h2>
                <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className="bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl font-semibold">
                  + Add New Client
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map(c => {
                  const status = calculateDueStatus(c.dueDate, c.paymentStatus);
                  return (
                    <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${status.bgBadge}`}>
                            {c.paymentStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">PAN/GST: {c.pangst || 'N/A'}</p>
                        <div className="mt-3 space-y-1 text-xs text-slate-600">
                          <p><span className="font-semibold text-slate-800">Service:</span> {c.service}</p>
                          <p><span className="font-semibold text-slate-800">Due Date:</span> {c.dueDate}</p>
                          <p><span className="font-semibold text-slate-800">Contact:</span> {c.phone}</p>
                        </div>
                        {c.notes && (
                          <p className="mt-2 text-[11px] bg-slate-50 p-2 rounded-lg text-slate-600 italic border border-slate-200">
                            "{c.notes}"
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="font-extrabold text-slate-900">₹{(c.amount || 0).toLocaleString('en-IN')}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => sendWhatsAppReminder(c)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingClient(c); setIsModalOpen(true); }} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteClient(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 3: FSSAI LICENSE CERTIFICATES */}
          {activeTab === 'fssai' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">FSSAI License Certificates Issued List</h2>
                  <p className="text-xs text-slate-500">Manage firm FSSAI registrations, renewal tracking, login credentials, and location details.</p>
                </div>
                <button
                  onClick={() => { setEditingFssai(null); setIsFssaiModalOpen(true); }}
                  className="bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add FSSAI Record</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fssaiRecords.map(record => {
                  const isVisible = showPasswordsMap[record.id];
                  return (
                    <div key={record.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 relative">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{record.firmName}</h3>
                          {record.address && <p className="text-xs text-slate-500 mt-0.5">{record.address}</p>}
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-semibold mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{record.village}, {record.taluka}, {record.district}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingFssai(record); setIsFssaiModalOpen(true); }}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                            title="Edit Record"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFssai(record.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">License / User ID</span>
                          <span className="font-mono font-semibold text-slate-900">{record.licenseNoUserId || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Old FSSAI User-ID</span>
                          <span className="font-mono text-slate-700">{record.oldFssaiUserId || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Password</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-800">{isVisible ? record.password : '••••••••'}</span>
                            <button onClick={() => toggleFssaiPassword(record.id)} className="text-slate-400 hover:text-slate-600">
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile No.</span>
                          <span className="font-semibold text-slate-800">{record.mobNo || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 text-white p-3 rounded-xl text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Email ID:</span>
                          <span className="font-medium">{record.emailId || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Email Password:</span>
                          <span className="font-mono">{record.emailPassword || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-bold">Issue Date</span>
                          <span className="font-semibold text-slate-700">{record.issueDate || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-bold">Valid Upto</span>
                          <span className="font-semibold text-amber-600">{record.validUpto || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-bold">Renewal Date</span>
                          <span className="font-semibold text-red-600">{record.renewalDate || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 text-right pt-1 border-t border-slate-100">
                        Record Added On: {record.addedDate}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 4: URGENT & EXPIRING */}
          {activeTab === 'expiring' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-amber-900 text-sm">Expiring Compliance Monitor</h3>
                  <p className="text-xs text-amber-700">Filter showing all compliance items expiring within 30 days or overdue.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase border-b border-slate-200">
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Status & Days</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {clients
                      .filter(c => {
                        if (c.paymentStatus === 'Paid') return false;
                        const status = calculateDueStatus(c.dueDate, c.paymentStatus);
                        return ['OVERDUE', 'EXTREMELY_URGENT', 'URGENT', 'WARNING', 'EARLY'].includes(status.category);
                      })
                      .map(c => {
                        const status = calculateDueStatus(c.dueDate, c.paymentStatus);
                        return (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-800">{c.name}</td>
                            <td className="py-3 px-4 text-slate-600">{c.service}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] border ${status.bgBadge}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold">{c.dueDate}</td>
                            <td className="py-3 px-4 text-center">
                              <button onClick={() => sendWhatsAppReminder(c)} className="bg-emerald-600 text-white px-3 py-1 rounded-xl text-xs font-semibold">
                                Dispatch Notice
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 5: PAYMENT TRACKER */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase border-b border-slate-200">
                      <th className="py-3 px-4">Client Name</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Fee Amount</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4 text-right">Quick Cycle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {clients.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-800">{c.name}</td>
                        <td className="py-3 px-4 text-slate-600">{c.service}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">₹{(c.amount || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : c.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                            {c.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleTogglePaymentStatus(c.id)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-xl text-xs font-medium border border-slate-300"
                          >
                            Toggle Status
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 6: WHATSAPP LOG */}
          {activeTab === 'whatsapp-log' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">Dispatch Activity History</h2>
                <button onClick={() => setWhatsappLogs([])} className="text-xs text-red-600 hover:underline">Clear History</button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
                {whatsappLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">No WhatsApp reminders dispatched yet.</p>
                ) : (
                  whatsappLogs.map(log => (
                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{log.clientName}</span>
                        <span className="text-slate-500"> ({log.phone})</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{log.service} • <span className="font-semibold text-emerald-600">{log.stage}</span></p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL DIALOG: CLIENT ENTRY */}
      {isModalOpen && (
        <ClientModal
          client={editingClient}
          onClose={() => { setIsModalOpen(false); setEditingClient(null); }}
          onSave={handleSaveClient}
        />
      )}

      {/* MODAL DIALOG: FSSAI ENTRY */}
      {isFssaiModalOpen && (
        <FssaiModal
          record={editingFssai}
          onClose={() => { setIsFssaiModalOpen(false); setEditingFssai(null); }}
          onSave={handleSaveFssai}
        />
      )}

    </div>
  );
}

// --- CLIENT FORM MODAL COMPONENT ---
function ClientModal({ client, onClose, onSave }) {
  const [dueDateOption, setDueDateOption] = useState('manual');
  const [formData, setFormData] = useState({
    id: client?.id || '',
    name: client?.name || '',
    pangst: client?.pangst || '',
    phone: client?.phone || '',
    email: client?.email || '',
    service: client?.service || 'GST Return Filing',
    dueDate: client?.dueDate || getRelativeDateStr(7),
    amount: client?.amount || '',
    paymentStatus: client?.paymentStatus || 'Pending',
    notes: client?.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      amount: Number(formData.amount) || 0
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base">
              {client ? 'Edit Client Compliance Record' : 'New Client Registration'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Client / Firm Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Kirloskar Heavy Engg Pvt Ltd"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">PAN / GSTIN No.</label>
              <input
                type="text"
                value={formData.pangst}
                onChange={(e) => setFormData({ ...formData, pangst: e.target.value })}
                placeholder="e.g. 27AAAAA0000A1Z5"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">WhatsApp Mobile No. *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 919876543210"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@domain.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Service Category *</label>
              <select
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="Income Tax Return (ITR)">Income Tax Return (ITR)</option>
                <option value="GST Return Filing">GST Return Filing</option>
                <option value="Tax Audit Report">Tax Audit Report</option>
                <option value="TDS Quarterly Return">TDS Quarterly Return</option>
                <option value="ROC Annual Return">ROC Annual Return</option>
                <option value="Advance Tax Payment">Advance Tax Payment</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Due / Expiry Date *</label>
              <select
                value={dueDateOption}
                onChange={(e) => {
                  const option = e.target.value;
                  setDueDateOption(option);
                  if (option !== 'manual') {
                    setFormData(current => ({ ...current, dueDate: getDateAfterMonths(Number(option)) }));
                  }
                }}
                className="w-full mb-2 px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                aria-label="Due date calculation option"
              >
                <option value="manual">Enter a date manually</option>
                <option value="1">Auto-calculate: 1 month from today</option>
                <option value="6">Auto-calculate: 6 months from today</option>
                <option value="12">Auto-calculate: 1 year from today</option>
              </select>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => {
                  setDueDateOption('manual');
                  setFormData({ ...formData, dueDate: e.target.value });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-slate-500">Choosing an automatic option calculates the date from today. You can still adjust the date manually.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Total Fee Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="5000"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Status *</label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Internal Notes</label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Filing instructions, document links, or payment reference..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold border border-slate-800"
            >
              Save Client Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- FSSAI FORM MODAL COMPONENT ---
function FssaiModal({ record, onClose, onSave }) {
  const [form, setForm] = useState({
    id: record?.id || '',
    firmName: record?.firmName || '',
    address: record?.address || '',
    emailId: record?.emailId || '',
    emailPassword: record?.emailPassword || '',
    oldFssaiUserId: record?.oldFssaiUserId || '',
    licenseNoUserId: record?.licenseNoUserId || '',
    password: record?.password || '',
    mobNo: record?.mobNo || '',
    issueDate: record?.issueDate || '',
    validUpto: record?.validUpto || '',
    renewalDate: record?.renewalDate || '',
    village: record?.village || '',
    taluka: record?.taluka || '',
    district: record?.district || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base">
              {record ? 'Edit FSSAI Certificate Record' : 'Add FSSAI License Certificate'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Firm Name *</label>
            <input
              type="text"
              required
              value={form.firmName}
              onChange={(e) => setForm({ ...form, firmName: e.target.value })}
              placeholder="e.g. Maruti Foods & Bakers"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Shop/Plot address"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Village</label>
              <input
                type="text"
                value={form.village}
                onChange={(e) => setForm({ ...form, village: e.target.value })}
                placeholder="Village"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Taluka</label>
              <input
                type="text"
                value={form.taluka}
                onChange={(e) => setForm({ ...form, taluka: e.target.value })}
                placeholder="Taluka"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">District</label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                placeholder="District"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email-Id</label>
              <input
                type="email"
                value={form.emailId}
                onChange={(e) => setForm({ ...form, emailId: e.target.value })}
                placeholder="firm@email.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">E-mail Password</label>
              <input
                type="text"
                value={form.emailPassword}
                onChange={(e) => setForm({ ...form, emailPassword: e.target.value })}
                placeholder="Email password"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Old FSSAI User-ID</label>
              <input
                type="text"
                value={form.oldFssaiUserId}
                onChange={(e) => setForm({ ...form, oldFssaiUserId: e.target.value })}
                placeholder="Old ID"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">License No. / User ID *</label>
              <input
                type="text"
                required
                value={form.licenseNoUserId}
                onChange={(e) => setForm({ ...form, licenseNoUserId: e.target.value })}
                placeholder="License number"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Password *</label>
              <input
                type="text"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="FSSAI portal password"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mob. No. *</label>
              <input
                type="tel"
                required
                value={form.mobNo}
                onChange={(e) => setForm({ ...form, mobNo: e.target.value })}
                placeholder="919876543210"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Issue Date</label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Valid Upto</label>
              <input
                type="date"
                value={form.validUpto}
                onChange={(e) => setForm({ ...form, validUpto: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Renewal Date</label>
              <input
                type="date"
                value={form.renewalDate}
                onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold border border-slate-800"
            >
              Save FSSAI Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
