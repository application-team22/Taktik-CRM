import { Clock, User, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { Client } from '../types/client';

interface Activity {
  id: string;
  type: 'client_added' | 'status_change' | 'upcoming_task';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ReactNode;
  color: string;
}

interface ActivityFeedProps {
  clients: Client[];
}

export default function ActivityFeed({ clients }: ActivityFeedProps) {
  const activities: Activity[] = generateActivities(clients);

  const sortedActivities = activities.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  ).slice(0, 8);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-6">Recent Activity</h3>

      <div className="space-y-4">
        {sortedActivities.length > 0 ? (
          sortedActivities.map((activity, index) => (
            <div key={activity.id} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.color} shadow-md`}>
                  {activity.icon}
                </div>
                {index < sortedActivities.length - 1 && (
                  <div className="w-0.5 h-12 bg-gradient-to-b from-gray-300 to-gray-200 mt-2" />
                )}
              </div>

              <div className="flex-1 pt-1">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-semibold text-gray-800">{activity.title}</h4>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{activity.description}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No activity yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function generateActivities(clients: Client[]): Activity[] {
  const activities: Activity[] = [];

  clients.forEach((client) => {
    const createdDate = new Date(client.created_at);

    activities.push({
      id: `${client.id}-created`,
      type: 'client_added',
      title: `New client: ${client.name}`,
      description: `${client.destination} • ${client.country}`,
      timestamp: createdDate,
      icon: <User className="w-5 h-5 text-white" />,
      color: 'bg-blue-500',
    });

    if (client.status === 'Booked') {
      const bookedDate = new Date(client.updated_at);
      activities.push({
        id: `${client.id}-booked`,
        type: 'status_change',
        title: `${client.name} marked as Booked`,
        description: `Booking confirmed - ${client.destination}`,
        timestamp: bookedDate,
        icon: <CheckCircle className="w-5 h-5 text-white" />,
        color: 'bg-emerald-500',
      });
    }

    if (client.destination) {
      activities.push({
        id: `${client.id}-destination`,
        type: 'upcoming_task',
        title: `Trip to ${client.destination}`,
        description: `Client: ${client.name}`,
        timestamp: createdDate,
        icon: <MapPin className="w-5 h-5 text-white" />,
        color: 'bg-cyan-500',
      });
    }
  });

  return activities;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
