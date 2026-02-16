import { useState } from 'react';
import { LayoutDashboard, MessageSquare, Users, TrendingUp, Settings, Activity, List, DollarSign, FileText, Menu, X, LogOut, RefreshCw, BookOpen } from 'lucide-react';
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
import LoginPage from './pages/LoginPage';
import { useAuth } from './lib/auth';
import { useBackgroundSync } from './lib/backgroundSync';

type Page = 'dashboard' | 'chats' | 'all-chats' | 'personnel' | 'reports' | 'monitoring' | 'bonus-settings' | 'bonus-reports' | 'user-guide' | 'settings';

function App() {
  const { session, loading, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { syncStatus } = useBackgroundSync();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
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
    <div className="min-h-screen bg-slate-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          {currentNav && <currentNav.icon className="w-5 h-5 text-blue-600" />}
          <span className="font-semibold text-slate-900 text-sm">{currentNav?.name || 'Dashboard'}</span>
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
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">LiveChat QA</h1>
              <p className="text-xs text-slate-500 mt-0.5">Kalite Kontrol Sistemi</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
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
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg mb-0.5 transition-colors text-sm ${
                      currentPage === item.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
              <div className="px-4 py-2">
                <div className="flex items-center gap-2 mb-1.5">
                  {syncStatus.syncing || syncStatus.analyzing ? (
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  ) : syncStatus.error ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  )}
                  <span className="text-xs font-medium text-slate-600">
                    {syncStatus.syncing ? 'Senkronize ediliyor...' :
                     syncStatus.analyzing ? 'Analiz ediliyor...' :
                     syncStatus.error ? 'Baglanti hatasi' :
                     'Otomatik senk. aktif'}
                  </span>
                </div>
                {syncStatus.lastSyncTime && (
                  <p className="text-[10px] text-slate-400 pl-[18px]">
                    Son: {new Date(syncStatus.lastSyncTime).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
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
  );
}

export default App;
