import { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { Client } from '../types/client';
import StatisticsCards from './StatisticsCards';
import ChartsSection from './ChartsSection';
import ActivityFeed from './ActivityFeed';

interface DashboardProps {
  clients: Client[];
  language?: 'EN' | 'AR';
}

function Dashboard({ clients, language = 'EN' }: DashboardProps) {
  if (clients.length === 0) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10">
            <Sparkles className="w-20 md:w-32 h-20 md:h-32" />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Taktik CRM Dashboard</h1>
            <p className="text-sm md:text-base text-blue-100 font-medium">Travel Agency Client Management System</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-12 text-center border border-gray-200">
          <div className="max-w-md mx-auto">
            <div className="w-16 md:w-20 h-16 md:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <Sparkles className="w-8 md:w-10 h-8 md:h-10 text-blue-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">Welcome to Taktik CRM!</h2>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
              Get started by adding your first client. Click the "Add Client" button in the Clients section to begin managing your travel agency customers.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-4">
              <p className="text-xs md:text-sm text-blue-800">
                Once you add clients, you'll see statistics, charts, and activity feeds right here on your dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10">
          <Sparkles className="w-20 md:w-32 h-20 md:h-32" />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Taktik CRM Dashboard</h1>
          <p className="text-sm md:text-base text-blue-100 font-medium">Travel Agency Client Management System</p>
        </div>
      </div>

      <StatisticsCards clients={clients} language={language} />

      <ChartsSection clients={clients} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed clients={clients} />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200">
          <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4">Quick Stats</h3>
          <div className="space-y-3 md:space-y-4">
            {getQuickStats(clients).map((stat) => (
              <div key={stat.label} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-xs md:text-sm font-medium text-gray-700">{stat.label}</span>
                <span className="text-base md:text-lg font-bold text-blue-600">{stat.value}</span>
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

export default memo(Dashboard);
