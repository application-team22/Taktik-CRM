import { Edit2, Trash2 } from 'lucide-react';
import { Client } from '../types/client';

interface ClientListProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

export default function ClientList({ clients, onEdit, onDelete }: ClientListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Booked':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Interested':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Contacted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Not Interested':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <p className="text-gray-500 text-lg">No clients yet. Add your first client to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Phone</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Destination</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Country</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Price</th>
              <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{client.name}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{client.phone_number}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{client.destination}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{client.country}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(client.status)}`}>
                    {client.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatPrice(client.price)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(client)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit client"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(client.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete client"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
