import { useState, useEffect } from 'react';
import { Users, Settings, BarChart3, DollarSign, TrendingUp, UserCheck } from 'lucide-react';
import { Client } from '../types/client';
import { Task } from '../types/task';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
  clients: Client[];
}

type AdminView = 'reports' | 'users' | 'settings';

export default function AdminPanel({ clients }: AdminPanelProps) {
  const [activeView, setActiveView] = useState<AdminView>('reports');
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*');

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const tabs = [
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const statusCounts = clients.reduce((acc, client) => {
    acc[client.status] = (acc[client.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalBookedValue = clients
    .filter((c) => c.status === 'Booked')
    .reduce((sum, c) => sum + c.price, 0);

  const totalLeads = clients.length;
  const bookedClients = statusCounts['Booked'] || 0;
  const conversionRate = totalLeads > 0 ? ((bookedClients / totalLeads) * 100).toFixed(1) : '0.0';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const recentMonths = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }).reverse();

  const clientsByMonth = recentMonths.map((month) => {
    return clients.filter((c) => {
      const clientDate = new Date(c.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
      return clientDate === month;
    }).length;
  });

  const maxMonthlyClients = Math.max(...clientsByMonth, 1);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-blue-100">System management and analytics</p>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex gap-2 px-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as AdminView)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-all border-b-2 ${
                    activeView === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeView === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Clients</p>
                      <p className="text-3xl font-bold mt-2">{totalLeads}</p>
                    </div>
                    <UserCheck className="w-8 h-8 text-blue-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold mt-2">{formatPrice(totalBookedValue)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm font-medium">Conversion Rate</p>
                      <p className="text-3xl font-bold mt-2">{conversionRate}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-yellow-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Active Tasks</p>
                      <p className="text-3xl font-bold mt-2">
                        {tasks.filter((t) => t.status === 'pending').length}
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-blue-200" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Clients by Status</h3>
                  <div className="space-y-3">
                    {[
                      { status: 'New Lead', color: 'bg-gray-500' },
                      { status: 'Contacted', color: 'bg-yellow-500' },
                      { status: 'Interested', color: 'bg-blue-500' },
                      { status: 'Not Interested', color: 'bg-red-500' },
                      { status: 'Booked', color: 'bg-green-500' },
                    ].map(({ status, color }) => {
                      const count = statusCounts[status] || 0;
                      const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{status}</span>
                            <span className="text-sm font-bold text-gray-900">
                              {count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`${color} h-3 rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Trends</h3>
                  <div className="space-y-3">
                    <div className="flex items-end justify-between h-48 gap-2">
                      {clientsByMonth.map((count, index) => {
                        const height = (count / maxMonthlyClients) * 100;
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full bg-gray-200 rounded-t-lg relative" style={{ height: '192px' }}>
                              <div
                                className="absolute bottom-0 w-full bg-blue-600 rounded-t-lg transition-all flex items-end justify-center pb-2"
                                style={{ height: `${height}%` }}
                              >
                                {count > 0 && (
                                  <span className="text-xs font-bold text-white">{count}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-gray-600 text-center">
                              {recentMonths[index].split(' ')[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Metrics Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Average Deal Value</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatPrice(bookedClients > 0 ? totalBookedValue / bookedClients : 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Active Leads</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {(statusCounts['New Lead'] || 0) +
                        (statusCounts['Contacted'] || 0) +
                        (statusCounts['Interested'] || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Lost Leads</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {statusCounts['Not Interested'] || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'users' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">User Management</h3>
                <p className="text-gray-600 mb-6">Manage system users and permissions</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Admin User</p>
                        <p className="text-sm text-gray-600">Full Access</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Email: admin@taktikcrm.com</p>
                    <p className="mt-1">Role: System Administrator</p>
                  </div>
                </div>

                {[1, 2, 3].map((i) => (
                  <div key={i} className="border-2 border-gray-200 bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Agent {i}</p>
                          <p className="text-sm text-gray-600">Sales Agent</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-gray-300 text-gray-700 text-xs font-medium rounded-full">
                        Available
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Slot available for new agent</p>
                      <p className="mt-1">Role: Sales Agent</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  User management features will be available in a future update. Contact your system
                  administrator to add or modify user accounts.
                </p>
              </div>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">System Settings</h3>
                <p className="text-gray-600 mb-6">Configure system preferences and company information</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Company Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Taktik Travel Agency"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      defaultValue="contact@taktiktravel.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      defaultValue="+1 (555) 123-4567"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Preferences</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive notifications for new leads</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">Task Reminders</p>
                      <p className="text-sm text-gray-600">Get reminded about upcoming tasks</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">Auto-Archive Old Leads</p>
                      <p className="text-sm text-gray-600">Archive leads older than 90 days</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
