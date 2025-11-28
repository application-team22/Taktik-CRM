import { Users, TrendingUp, Phone, MapPin } from 'lucide-react';
import { Client } from '../types/client';

interface DashboardProps {
  clients: Client[];
}

export default function Dashboard({ clients }: DashboardProps) {
  const totalClients = clients.length;

  const statusCounts = clients.reduce((acc, client) => {
    acc[client.status] = (acc[client.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const recentClients = [...clients]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const statCards = [
    { label: 'Total Clients', value: totalClients, icon: Users, color: 'bg-blue-500' },
    { label: 'New Leads', value: statusCounts['New Lead'] || 0, icon: TrendingUp, color: 'bg-blue-400' },
    { label: 'Contacted', value: statusCounts['Contacted'] || 0, icon: Phone, color: 'bg-blue-600' },
    { label: 'Booked', value: statusCounts['Booked'] || 0, icon: MapPin, color: 'bg-blue-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">Taktik CRM</h1>
        <p className="text-blue-100">Travel Agency Client Management System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Status Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['New Lead', 'Contacted', 'Interested', 'Not Interested', 'Booked'].map((status) => (
            <div key={status} className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">{status}</p>
              <p className="text-2xl font-bold text-blue-600">{statusCounts[status] || 0}</p>
            </div>
          ))}
        </div>
      </div>

      {recentClients.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Clients</h2>
          <div className="space-y-3">
            {recentClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{client.name}</p>
                  <p className="text-sm text-gray-600">
                    {client.destination} • {client.country}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    client.status === 'Booked' ? 'bg-green-100 text-green-800' :
                    client.status === 'Interested' ? 'bg-blue-100 text-blue-800' :
                    client.status === 'Contacted' ? 'bg-yellow-100 text-yellow-800' :
                    client.status === 'Not Interested' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {client.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
