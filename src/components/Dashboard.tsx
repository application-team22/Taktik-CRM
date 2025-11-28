import { Sparkles } from 'lucide-react';
import { Client } from '../types/client';
import StatisticsCards from './StatisticsCards';
import ChartsSection from './ChartsSection';
import ActivityFeed from './ActivityFeed';

interface DashboardProps {
  clients: Client[];
}

export default function Dashboard({ clients }: DashboardProps) {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10">
          <Sparkles className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Taktik CRM Dashboard</h1>
          <p className="text-blue-100 font-medium">Travel Agency Client Management System</p>
        </div>
      </div>

      <StatisticsCards clients={clients} />

      <ChartsSection clients={clients} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed clients={clients} />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            {getQuickStats(clients).map((stat) => (
              <div key={stat.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                <span className="text-lg font-bold text-blue-600">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getQuickStats(clients: Client[]) {
  const statusCounts = clients.reduce((acc, client) => {
    acc[client.status] = (acc[client.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return [
    { label: 'Total Clients', value: clients.length },
    { label: 'Booked', value: statusCounts['Booked'] || 0 },
    { label: 'Interested', value: statusCounts['Interested'] || 0 },
    { label: 'Contacted', value: statusCounts['Contacted'] || 0 },
    { label: 'Not Interested', value: statusCounts['Not Interested'] || 0 },
    { label: 'New Leads', value: statusCounts['New Lead'] || 0 },
  ];
}
