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
  const STATUS_COLORS = {
    'New Lead': '#3b82f6',
    'Contacted': '#f59e0b',
    'Interested': '#10b981',
    'Not Interested': '#ef4444',
    'Booked': '#8b5cf6',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Clients by Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={statusData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Country Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={countryData}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
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
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 lg:col-span-2">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Booking Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={bookingTrend}
            margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="booked"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
              name="Booked"
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              name="Total Clients"
            />
          </LineChart>
        </ResponsiveContainer>
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
