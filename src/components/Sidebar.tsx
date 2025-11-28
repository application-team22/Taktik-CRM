import { LayoutDashboard, Users, CheckSquare, Settings, Plane } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'admin', label: 'Admin Panel', icon: Settings },
  ];

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white h-screen w-64 border-r border-gray-200 fixed left-0 top-0 shadow-lg">
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl shadow-md">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900 block">Taktik CRM</span>
            <span className="text-xs text-gray-500 font-medium">Travel Management</span>
          </div>
        </div>
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200 transform scale-105'
                      : 'text-gray-700 hover:bg-white hover:shadow-md hover:scale-102'
                  }`}
                >
                  <Icon className="w-5 h-5" />
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
  );
}
