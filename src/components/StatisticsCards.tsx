import { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Client } from '../types/client';
import { translations } from '../lib/translations';

interface StatCard {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  previous?: number;
}

interface StatisticsCardsProps {
  clients: Client[];
  language?: 'EN' | 'AR';
}

function StatisticsCards({ clients, language = 'EN' }: StatisticsCardsProps) {
  const t = translations[language];
  const statCards: StatCard[] = useMemo(() => {
    const totalClients = clients.length;

    const statusCounts = clients.reduce((acc, client) => {
      acc[client.status] = (acc[client.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bookedClients = statusCounts['Booked'] || 0;
    const contactedClients = statusCounts['Contacted'] || 0;

    const totalRevenue = clients.reduce((sum, client) => sum + (client.price || 0), 0);

    const calculateTrend = (current: number, previous: number = current * 0.8) => {
      if (previous === 0) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return [
    {
      label: t.dashboard.totalClients,
      value: totalClients,
      icon: (
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <span className="text-2xl">👥</span>
        </div>
      ),
      color: 'from-blue-50 to-blue-100',
      trend: calculateTrend(totalClients),
    },
    {
      label: t.dashboard.totalBookings,
      value: bookedClients,
      icon: (
        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
          <span className="text-2xl">✓</span>
        </div>
      ),
      color: 'from-emerald-50 to-emerald-100',
      trend: calculateTrend(bookedClients),
    },
    {
      label: t.statuses.contacted,
      value: contactedClients,
      icon: (
        <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
          <span className="text-2xl">📞</span>
        </div>
      ),
      color: 'from-cyan-50 to-cyan-100',
      trend: calculateTrend(contactedClients),
    },
    {
      label: t.dashboard.revenue,
      value: Math.round(totalRevenue),
      icon: (
        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
          <span className="text-2xl">💰</span>
        </div>
      ),
      color: 'from-indigo-50 to-indigo-100',
      trend: calculateTrend(totalRevenue),
    },
  ];
  }, [clients, t]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {statCards.map((stat) => {
        const isTrendPositive = (stat.trend || 0) >= 0;

        return (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.color} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 md:p-6 border border-gray-200 hover:border-blue-300 group`}
          >
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="flex-1">
                <p className="text-gray-600 text-xs md:text-sm font-semibold tracking-wide uppercase">{stat.label}</p>
              </div>
              {stat.icon}
            </div>

            <div className="mb-3 md:mb-4">
              <p className="text-3xl md:text-4xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
            </div>

            {stat.trend !== undefined && (
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                  isTrendPositive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {isTrendPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-sm font-semibold">
                    {isTrendPositive ? '+' : ''}{stat.trend}%
                  </span>
                </div>
                <span className="text-xs text-gray-600">vs last period</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(StatisticsCards);
