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

  const countryData = Object.entries(countryCounts)
    .map(([country, count]) => ({
      name: country,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  const bookingTrend = generateBookingTrendData(clients);

  const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

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
              label={({ name, value, percent }) => {
                const displayName = name.length > 10 ? `${name.slice(0, 10)}...` : name;
                return window.innerWidth < 640
                  ? `${value}`
                  : `${displayName}: ${value}`;
              }}
              outerRadius={window.innerWidth < 640 ? 70 : 80}
              fill="#8884d8"
              dataKey="value"
            >
              {countryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {countryData.map((country, index) => (
            <div key={country.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs text-gray-700 truncate">{country.name}</span>
            </div>
          ))}
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
