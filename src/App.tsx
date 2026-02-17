import { useState } from 'react';
import { LayoutDashboard, MessageSquare, Users, TrendingUp, Settings, Activity, List, DollarSign, FileText, Menu, X, LogOut, RefreshCw, BookOpen, GraduationCap } from 'lucide-react';
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

function App() {
  const { session, loading, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { syncStatus } = useBackgroundSync();

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

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'all-chats', name: 'Tum Chatler', icon: List },
    { id: 'chats', name: 'Chat Analizleri', icon: MessageSquare },
    { id: 'personnel', name: 'Personel', icon: Users },
    { id: 'reports', name: 'Raporlar', icon: TrendingUp },
    { id: 'monitoring', name: 'Canli Izleme', icon: Activity },
    { id: 'bonus-settings', name: 'Prim Ayarlari', icon: DollarSign },
    { id: 'bonus-reports', name: 'Prim Raporlari', icon: FileText },
    { id: 'coaching', name: 'Yönetici Koçluk Merkezi', icon: GraduationCap },
    { id: 'user-guide', name: 'Kullanim Kilavuzu', icon: BookOpen },
    { id: 'settings', name: 'Ayarlar', icon: Settings },
  ];

  const handleNavClick = (id: Page) => {
    setCurrentPage(id);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'all-chats':
        return <ChatList />;
      case 'chats':
        return <ChatAnalysisList />;
      case 'personnel':
        return <PersonnelAnalytics />;
      case 'reports':
        return <Reports />;
      case 'monitoring':
        return <Monitoring />;
      case 'bonus-settings':
        return <BonusSettings />;
      case 'bonus-reports':
        return <BonusReports />;
      case 'coaching':
        return <CoachingCenter />;
      case 'user-guide':
        return <UserGuide />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  const currentNav = navigation.find(n => n.id === currentPage);

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-cyan-500/20 px-4 py-3 flex items-center justify-between backdrop-blur-xl">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all duration-200"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          {currentNav && <currentNav.icon className="w-5 h-5 text-cyan-400" />}
          <span className="font-semibold text-white text-sm">{currentNav?.name || 'Dashboard'}</span>
        </div>
        <div className="w-10" />
      </div>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        <aside className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-cyan-500/20
          transform transition-transform duration-300 ease-in-out backdrop-blur-xl
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          shadow-2xl shadow-cyan-500/10
        `}>
          <div className="p-6 border-b border-cyan-500/20 flex items-center justify-between bg-gradient-to-r from-cyan-950/50 to-transparent">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                LiveChat QA
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Kalite Kontrol Sistemi</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-3 overflow-y-auto flex flex-col" style={{ height: 'calc(100% - 73px)' }}>
            <div className="flex-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id as Page)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg mb-0.5 transition-all duration-200 text-sm group ${
                      currentPage === item.id
                        ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 font-medium shadow-lg shadow-cyan-500/20 border border-cyan-500/30'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-cyan-300 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${currentPage === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-cyan-500/20 pt-3 mt-3 space-y-2">
              <div className="px-4 py-2 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1.5">
                  {syncStatus.syncing || syncStatus.analyzing ? (
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  ) : syncStatus.error ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                  )}
                  <span className="text-xs font-medium text-slate-300">
                    {syncStatus.syncing ? 'Senkronize ediliyor...' :
                     syncStatus.analyzing ? 'Analiz ediliyor...' :
                     syncStatus.error ? 'Baglanti hatasi' :
                     'Otomatik senk. aktif'}
                  </span>
                </div>
                {syncStatus.lastSyncTime && (
                  <p className="text-[10px] text-slate-500 pl-[18px]">
                    Son: {new Date(syncStatus.lastSyncTime).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200 border border-transparent hover:border-rose-500/30 group"
              >
                <LogOut className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                <span>Cikis Yap</span>
              </button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 min-w-0">
          {renderPage()}
        </main>
      </div>
    </div>
    </NotificationProvider>
  );
}

export default App;
