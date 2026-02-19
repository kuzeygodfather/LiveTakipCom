import { useState } from 'react';
import { LayoutDashboard, MessageSquare, Users, TrendingUp, Settings, Activity, List, DollarSign, FileText, Menu, X, LogOut, RefreshCw, BookOpen, GraduationCap, ChevronRight } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ChatAnalysisList from './pages/ChatAnalysisList';
import ChatList from './pages/ChatList';
import PersonnelAnalytics from './pages/PersonnelAnalytics';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';
import Monitoring from './pages/Monitoring';
import BonusSettings from './pages/BonusSettings';
import BonusReports from './pages/BonusReports';
import UserGuide from './pages/UserGuide';
import CoachingCenter from './pages/CoachingCenter';
import LoginPage from './pages/LoginPage';
import { useAuth } from './lib/auth';
import { useBackgroundSync } from './lib/backgroundSync';
import { NotificationProvider } from './lib/notifications';

type Page = 'dashboard' | 'chats' | 'all-chats' | 'personnel' | 'reports' | 'monitoring' | 'bonus-settings' | 'bonus-reports' | 'coaching' | 'user-guide' | 'settings';

const navigationGroups = [
  {
    label: null,
    items: [
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, accent: 'cyan' },
    ],
  },
  {
    label: 'Chat',
    items: [
      { id: 'all-chats', name: 'Tum Chatler', icon: List, accent: 'cyan' },
      { id: 'chats', name: 'Chat Analizleri', icon: MessageSquare, accent: 'cyan' },
    ],
  },
  {
    label: 'Analitik',
    items: [
      { id: 'personnel', name: 'Personel', icon: Users, accent: 'emerald' },
      { id: 'reports', name: 'Raporlar', icon: TrendingUp, accent: 'emerald' },
      { id: 'monitoring', name: 'Canli Izleme', icon: Activity, accent: 'emerald' },
    ],
  },
  {
    label: 'Prim',
    items: [
      { id: 'bonus-settings', name: 'Prim Ayarlari', icon: DollarSign, accent: 'amber' },
      { id: 'bonus-reports', name: 'Prim Raporlari', icon: FileText, accent: 'amber' },
    ],
  },
  {
    label: 'Diger',
    items: [
      { id: 'coaching', name: 'Kocluk Merkezi', icon: GraduationCap, accent: 'sky' },
      { id: 'user-guide', name: 'Kullanim Kilavuzu', icon: BookOpen, accent: 'sky' },
      { id: 'settings', name: 'Ayarlar', icon: Settings, accent: 'slate' },
    ],
  },
];

const accentClasses: Record<string, { bg: string; text: string; border: string; glow: string; iconBg: string }> = {
  cyan: {
    bg: 'from-cyan-500/15 to-cyan-500/5',
    text: 'text-cyan-300',
    border: 'border-cyan-400/60',
    glow: 'shadow-cyan-500/25',
    iconBg: 'bg-cyan-500/20 text-cyan-300',
  },
  emerald: {
    bg: 'from-emerald-500/15 to-emerald-500/5',
    text: 'text-emerald-300',
    border: 'border-emerald-400/60',
    glow: 'shadow-emerald-500/25',
    iconBg: 'bg-emerald-500/20 text-emerald-300',
  },
  amber: {
    bg: 'from-amber-500/15 to-amber-500/5',
    text: 'text-amber-300',
    border: 'border-amber-400/60',
    glow: 'shadow-amber-500/25',
    iconBg: 'bg-amber-500/20 text-amber-300',
  },
  sky: {
    bg: 'from-sky-500/15 to-sky-500/5',
    text: 'text-sky-300',
    border: 'border-sky-400/60',
    glow: 'shadow-sky-500/25',
    iconBg: 'bg-sky-500/20 text-sky-300',
  },
  slate: {
    bg: 'from-slate-500/15 to-slate-500/5',
    text: 'text-slate-300',
    border: 'border-slate-400/40',
    glow: 'shadow-slate-500/10',
    iconBg: 'bg-slate-500/20 text-slate-300',
  },
};

function App() {
  const { session, loading, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const { syncStatus } = useBackgroundSync();

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin shadow-2xl shadow-cyan-500/30" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-emerald-400 rounded-full animate-spin shadow-2xl shadow-emerald-500/30" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLogin={() => {}} />;
  }

  const allNavItems = navigationGroups.flatMap(g => g.items);
  const currentNav = allNavItems.find(n => n.id === currentPage);

  const handleNavClick = (id: Page) => {
    setCurrentPage(id);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'all-chats': return <ChatList />;
      case 'chats': return <ChatAnalysisList />;
      case 'personnel': return <PersonnelAnalytics />;
      case 'reports': return <Reports />;
      case 'monitoring': return <Monitoring />;
      case 'bonus-settings': return <BonusSettings />;
      case 'bonus-reports': return <BonusReports />;
      case 'coaching': return <CoachingCenter />;
      case 'user-guide': return <UserGuide />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="relative px-5 pt-6 pb-5 border-b border-white/5 flex items-center justify-between overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/8 via-transparent to-emerald-500/5 pointer-events-none" />
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-xl blur-sm opacity-40" />
            <div className="relative w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-cyan-500/30 flex items-center justify-center overflow-hidden shadow-lg">
              <img src="/image.png" alt="Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-cyan-300 via-cyan-200 to-emerald-300 bg-clip-text text-transparent tracking-tight leading-none">
              LiveChat QA
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5 tracking-wide uppercase font-medium">Kalite Kontrol</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden relative p-1.5 rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-0.5 scrollbar-hide">
        {navigationGroups.map((group, gi) => {
          const isCollapsed = group.label ? collapsedGroups.has(group.label) : false;
          const hasActiveItem = group.items.some(i => i.id === currentPage);
          return (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              {group.label && (
                <button
                  onClick={() => toggleGroup(group.label!)}
                  className="w-full px-3 mb-1.5 flex items-center gap-2 group/header"
                >
                  <span className={`text-[9px] font-bold tracking-widest uppercase transition-colors duration-200 ${hasActiveItem && isCollapsed ? 'text-cyan-500/70' : 'text-slate-600 group-hover/header:text-slate-400'}`}>
                    {group.label}
                  </span>
                  {hasActiveItem && isCollapsed && (
                    <span className="w-1 h-1 rounded-full bg-cyan-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 h-px bg-white/5 group-hover/header:bg-white/10 transition-colors duration-200" />
                  <ChevronRight className={`w-3 h-3 text-slate-600 group-hover/header:text-slate-400 transition-all duration-200 flex-shrink-0 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} />
                </button>
              )}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  const accent = accentClasses[item.accent];
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id as Page)}
                      className={`
                        relative w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 font-medium
                        transition-all duration-200 group overflow-hidden
                        ${isActive
                          ? `bg-gradient-to-r ${accent.bg} ${accent.text} shadow-lg ${accent.glow} border border-white/8`
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                        }
                      `}
                    >
                      {isActive && (
                        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full ${accent.border.replace('border-', 'bg-')}`} />
                      )}
                      <span className={`
                        relative flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-all duration-200
                        ${isActive ? accent.iconBg : 'bg-white/5 text-slate-400 group-hover:bg-white/8 group-hover:text-slate-200'}
                      `}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="flex-1 text-left truncate text-sm">{item.name}</span>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 opacity-60 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-white/5 space-y-2">
        <div className={`
          px-3.5 py-2.5 rounded-xl border transition-all duration-300
          ${syncStatus.syncing || syncStatus.analyzing
            ? 'bg-cyan-500/8 border-cyan-500/20'
            : syncStatus.error
            ? 'bg-rose-500/8 border-rose-500/20'
            : 'bg-emerald-500/8 border-emerald-500/20'
          }
        `}>
          <div className="flex items-center gap-2.5">
            {syncStatus.syncing || syncStatus.analyzing ? (
              <div className="relative flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              </div>
            ) : syncStatus.error ? (
              <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 shadow-lg shadow-rose-500/50" />
            ) : (
              <div className="relative flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-60" />
              </div>
            )}
            <div className="min-w-0">
              <p className={`text-xs font-medium truncate leading-none ${
                syncStatus.syncing || syncStatus.analyzing ? 'text-cyan-300' :
                syncStatus.error ? 'text-rose-300' : 'text-emerald-300'
              }`}>
                {syncStatus.syncing ? 'Senkronize ediliyor...' :
                 syncStatus.analyzing ? 'Analiz ediliyor...' :
                 syncStatus.error ? 'Baglanti hatasi' :
                 'Otomatik senk. aktif'}
              </p>
              {syncStatus.lastSyncTime && (
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Son: {new Date(syncStatus.lastSyncTime).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 border border-transparent hover:border-rose-500/20 group"
        >
          <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-rose-500/15 transition-all duration-200">
            <LogOut className="w-4 h-4" />
          </span>
          <span className="text-[13px] font-medium">Cikis Yap</span>
        </button>
      </div>
    </div>
  );

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-950/90 border-b border-white/5 px-4 py-3 flex items-center justify-between backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {currentNav && (
              <span className={`text-xs font-semibold ${accentClasses[currentNav.accent]?.text || 'text-white'}`}>
                {currentNav.name}
              </span>
            )}
          </div>
          <div className="w-9" />
        </div>

        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex">
          <aside className={`
            fixed top-0 left-0 z-50 h-full w-64
            bg-[#0d1117] border-r border-white/[0.06]
            transform transition-transform duration-300 ease-in-out
            lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            shadow-2xl shadow-black/50
          `}>
            <SidebarContent />
          </aside>

          <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-w-0">
            {renderPage()}
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}

export default App;
