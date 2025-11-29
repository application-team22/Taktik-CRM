import { LayoutDashboard, Users, CheckSquare, Settings, X, Upload } from 'lucide-react';
import { translations } from '../lib/translations';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
  language: 'EN' | 'AR';
}

export default function Sidebar({ currentView, onNavigate, isOpen, onClose, language }: SidebarProps) {
  const t = translations[language];

  const menuItems = [
    { id: 'dashboard', label: t.navigation.dashboard, icon: LayoutDashboard },
    { id: 'clients', label: t.navigation.clients, icon: Users },
    { id: 'tasks', label: t.navigation.tasks, icon: CheckSquare },
    { id: 'import', label: t.navigation.import, icon: Upload },
    { id: 'admin', label: t.navigation.admin, icon: Settings },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`bg-gradient-to-b from-slate-50 to-white h-screen w-64 fixed top-0 shadow-lg z-50 transition-transform duration-300 ease-in-out ${
          language === 'AR'
            ? `border-l border-gray-200 right-0 ${isOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 animate-slide-in-rtl`
            : `border-r border-gray-200 left-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 animate-slide-in`
        }`}
      >
        <div className={`p-6 border-b border-gray-200 bg-white flex items-center justify-between ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`flex items-center gap-3 ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}>
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXbGugbzv4HWLxhujILeIK99Vc7BtVSsA7Cw&s"
              alt="Taktik Travel Logo"
              className="h-10 w-auto object-contain"
            />
            <div>
              <span className="text-xl font-bold text-gray-900 block">{t.branding.appName}</span>
              <span className="text-xs text-gray-500 font-medium">{t.branding.appSubtitle}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4">
          <ul className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'} ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200 transform scale-105'
                        : 'text-gray-700 hover:bg-white hover:shadow-md hover:scale-102'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gradient-to-t from-gray-50 to-transparent">
          <div className="text-xs text-gray-500 text-center">
            <p className="font-medium">Version 1.0</p>
          </div>
        </div>
      </div>
    </>
  );
}
