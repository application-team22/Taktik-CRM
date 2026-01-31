import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Client } from '../types/client';

interface ChartsSectionProps {
  clients: Client[];
}

export default function ChartsSection({ clients }: ChartsSectionProps) {
  const statusCounts = clients.reduce((acc, client) => {
    acc[client.status] = (acc[client.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    count,
  }));

  const countryCounts = clients.reduce((acc, client) => {
    acc[client.country] = (acc[client.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalClients = clients.length;
  const countryData = Object.entries(countryCounts)
    .map(([country, count]) => ({
      name: country,
      value: count,
      percentage: totalClients > 0 ? ((count / totalClients) * 100).toFixed(1) : '0',
    }))
    .sort((a, b) => b.value - a.value);

  const bookingTrend = generateBookingTrendData(clients);

  const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  // Custom label renderer for pie chart - shows only percentage, hides if < 5%
  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percentage } = props;
    const percentValue = parseFloat(percentage);

    // Hide label if percentage is less than 5%
    if (percentValue < 5) {
      return null;
    }

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#1f2937"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-semibold"
        style={{ fontSize: '14px', fontWeight: 600 }}
      >
        {`${percentage}%`}
      </text>
    );
  };

  // Custom tooltip content
  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600 mt-1">
            Count: <span className="font-semibold">{data.value}</span>
          </p>
          <p className="text-sm text-gray-600">
            Percentage: <span className="font-semibold">{data.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200">
        <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4">Clients by Status</h3>
        <div className="w-full overflow-x-auto -mx-2 px-2">
          <ResponsiveContainer width="100%" height={300} minWidth={300}>
            <BarChart
              data={statusData}
              margin={{ top: 20, right: 10, left: -20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200">
        <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4">Country Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={countryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={window.innerWidth < 640 ? 80 : 95}
              innerRadius={0}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {countryData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={renderCustomTooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 border-t pt-4">
          <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Legend</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {countryData.map((country, index) => (
              <div key={country.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-gray-700 truncate">{country.name}</span>
                <span className="text-xs text-gray-500 font-medium">({country.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200 lg:col-span-2">
        <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4">Booking Trends</h3>
        <div className="text-xs text-gray-500 mb-2 md:hidden">Swipe to see all data</div>
        <div className="w-full overflow-x-auto -mx-2 px-2">
          <ResponsiveContainer width="100%" height={300} minWidth={500}>
            <LineChart
              data={bookingTrend}
              margin={{ top: 20, right: 10, left: -20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={100}
                interval={window.innerWidth < 640 ? 2 : 0}
              />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
              />
              <Legend wrapperStyle={{ fontSize: '14px' }} />
              <Line
                type="monotone"
                dataKey="booked"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5 }}
                name="Booked"
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 3 }}
                activeDot={{ r: 5 }}
                name="Total Clients"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function generateBookingTrendData(clients: Client[]) {
  const days = 30;
  const today = new Date();
  const data = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const clientsUpToDate = clients.filter(
      (client) => new Date(client.created_at) <= date
    );

    const bookedClients = clientsUpToDate.filter(
      (client) => client.status === 'Booked'
    ).length;

    data.push({
      date: dateStr,
      total: clientsUpToDate.length,
      booked: bookedClients,
    });
  }

  return data;
}
