import { useState } from 'react';
import { Edit2, Trash2, Search, X, Download, MessageSquare } from 'lucide-react';
import { Client } from '../types/client';

interface ClientListEnhancedProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onViewNotes: (client: Client) => void;
  onViewDetails: (client: Client) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'price-high' | 'price-low' | 'date-new' | 'date-old';

export default function ClientListEnhanced({ clients, onEdit, onDelete, onViewNotes, onViewDetails }: ClientListEnhancedProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [sortOption, setSortOption] = useState<SortOption>('date-new');

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

  const uniqueCountries = Array.from(new Set(clients.map(c => c.country))).sort();

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.country.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
    const matchesCountry = countryFilter === 'All' || client.country === countryFilter;

    return matchesSearch && matchesStatus && matchesCountry;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    switch (sortOption) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'price-high':
        return b.price - a.price;
      case 'price-low':
        return a.price - b.price;
      case 'date-new':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'date-old':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default:
        return 0;
    }
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setCountryFilter('All');
    setSortOption('date-new');
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Phone', 'Destination', 'Country', 'Status', 'Price', 'Created At'];
    const rows = sortedClients.map(client => [
      client.name,
      client.phone_number,
      client.destination,
      client.country,
      client.status,
      client.price.toString(),
      new Date(client.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'All' || countryFilter !== 'All' || sortOption !== 'date-new';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-lg p-3 md:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 md:py-2.5 border border-gray-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 md:py-2.5 border border-gray-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          >
            <option value="All">All Statuses</option>
            <option value="New Lead">New Lead</option>
            <option value="Contacted">Contacted</option>
            <option value="Interested">Interested</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Booked">Booked</option>
          </select>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-4 py-3 md:py-2.5 border border-gray-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          >
            <option value="All">All Countries</option>
            {uniqueCountries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-4 py-3 md:py-2.5 border border-gray-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          >
            <option value="date-new">Newest First</option>
            <option value="date-old">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="price-high">Price (High to Low)</option>
            <option value="price-low">Price (Low to High)</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 hover:scale-105 shadow-sm w-full sm:w-auto"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}
            <span className="text-xs md:text-sm text-gray-600 text-center sm:text-left">
              Showing {sortedClients.length} of {clients.length}
            </span>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 font-semibold text-xs md:text-sm w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {sortedClients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-12 text-center">
          <p className="text-gray-500 text-base md:text-lg">
            {clients.length === 0
              ? 'No clients yet. Add your first client to get started!'
              : 'No clients match your filters. Try adjusting your search criteria.'}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
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
                  {sortedClients.map((client) => (
                    <tr key={client.id} className="hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                      <td
                        onClick={() => onViewDetails(client)}
                        className="px-6 py-4 text-sm font-medium text-gray-900"
                      >
                        {client.name}
                      </td>
                      <td
                        onClick={() => onViewDetails(client)}
                        className="px-6 py-4 text-sm text-gray-700"
                      >
                        {client.phone_number}
                      </td>
                      <td
                        onClick={() => onViewDetails(client)}
                        className="px-6 py-4 text-sm text-gray-700"
                      >
                        {client.destination}
                      </td>
                      <td
                        onClick={() => onViewDetails(client)}
                        className="px-6 py-4 text-sm text-gray-700"
                      >
                        {client.country}
                      </td>
                      <td
                        onClick={() => onViewDetails(client)}
                        className="px-6 py-4"
                      >
                        <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${getStatusColor(client.status)}`}>
                          {client.status}
                        </span>
                      </td>
                      <td
                        onClick={() => onViewDetails(client)}
                        className="px-6 py-4 text-sm font-semibold text-gray-900"
                      >
                        {formatPrice(client.price)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewNotes(client);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
                            title="View notes"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(client);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Edit client"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(client.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
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

          <div className="md:hidden space-y-3">
            {sortedClients.map((client) => (
              <div
                key={client.id}
                onClick={() => onViewDetails(client)}
                className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 hover:shadow-xl transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{client.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{client.phone_number}</p>
                  </div>
                  <span className={`ml-2 inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${getStatusColor(client.status)}`}>
                    {client.status}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-600">Destination</p>
                    <p className="text-sm font-medium text-gray-900">{client.destination}</p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs text-gray-600">Country</p>
                      <p className="text-sm font-medium text-gray-900">{client.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Price</p>
                      <p className="text-sm font-semibold text-blue-600">{formatPrice(client.price)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(client);
                    }}
                    className="flex-1 py-2 px-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  >
                    View Details
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewNotes(client);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                    title="View notes"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(client);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title="Edit client"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(client.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Delete client"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
