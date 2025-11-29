import { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2, Search, X, Download, MessageSquare, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Client } from '../types/client';
import { translations } from '../lib/translations';

interface ClientListEnhancedProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onViewNotes: (client: Client) => void;
  onViewDetails: (client: Client) => void;
  language: 'EN' | 'AR';
}

type SortOption = 'name-asc' | 'name-desc' | 'price-high' | 'price-low' | 'date-new' | 'date-old';

const ITEMS_PER_PAGE = 20;

export default function ClientListEnhanced({ clients, onEdit, onDelete, onViewNotes, onViewDetails, language }: ClientListEnhancedProps) {
  const t = translations[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [sortOption, setSortOption] = useState<SortOption>('date-new');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setIsSearching(false);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, countryFilter, sortOption]);

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

  const uniqueCountries = useMemo(
    () => Array.from(new Set(clients.map(c => c.country))).sort(),
    [clients]
  );

  const filteredAndSortedClients = useMemo(() => {
    const filtered = clients.filter(client => {
      const matchesSearch =
        client.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        client.destination.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        client.country.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
      const matchesCountry = countryFilter === 'All' || client.country === countryFilter;

      return matchesSearch && matchesStatus && matchesCountry;
    });

    const sorted = [...filtered].sort((a, b) => {
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

    return sorted;
  }, [clients, debouncedSearch, statusFilter, countryFilter, sortOption]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedClients = filteredAndSortedClients.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('All');
    setCountryFilter('All');
    setSortOption('date-new');
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Phone', 'Destination', 'Country', 'Status', 'Price', 'Created At'];
    const rows = filteredAndSortedClients.map(client => [
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

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4" dir={language === 'AR' ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-xl shadow-lg p-3 md:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="relative">
              <Search className={`absolute ${language === 'AR' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
              <input
                type="text"
                placeholder={t.placeholders.searchClients}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${language === 'AR' ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-3 md:py-2.5 border border-gray-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
              />
              {isSearching && (
                <Loader2 className={`absolute ${language === 'AR' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600 animate-spin`} />
              )}
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 md:py-2.5 border border-gray-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          >
            <option value="All">{t.filters.allStatuses}</option>
            <option value="New Lead">{t.statuses.newLead}</option>
            <option value="Contacted">{t.statuses.contacted}</option>
            <option value="Interested">{t.statuses.interested}</option>
            <option value="Not Interested">{t.statuses.notInterested}</option>
            <option value="Booked">{t.statuses.booked}</option>
          </select>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-4 py-3 md:py-2.5 border border-gray-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          >
            <option value="All">{t.filters.allCountries}</option>
            {uniqueCountries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-4 py-3 md:py-2.5 border border-gray-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          >
            <option value="date-new">{t.sortOptions.newestFirst}</option>
            <option value="date-old">{t.sortOptions.oldestFirst}</option>
            <option value="name-asc">{t.sortOptions.nameAZ}</option>
            <option value="name-desc">{t.sortOptions.nameZA}</option>
            <option value="price-high">{t.sortOptions.priceHigh}</option>
            <option value="price-low">{t.sortOptions.priceLow}</option>
          </select>
        </div>

        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 ${language === 'AR' ? 'flex-row-reverse' : ''}`}>
          <div className={`flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto ${language === 'AR' ? 'flex-row-reverse' : ''}`}>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className={`flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 hover:scale-105 shadow-sm w-full sm:w-auto ${language === 'AR' ? 'flex-row-reverse' : ''}`}
              >
                <X className="w-4 h-4" />
                {t.common.filterLabel}
              </button>
            )}
            <span className={`text-xs md:text-sm text-gray-600 ${language === 'AR' ? 'text-right' : 'text-left'} sm:text-left`}>
              {t.pagination.showing} {startIndex + 1}-{Math.min(endIndex, filteredAndSortedClients.length)} {t.pagination.of} {filteredAndSortedClients.length} {t.pagination.clients} {filteredAndSortedClients.length !== clients.length && `(${t.common.filteredFrom} ${clients.length} ${t.common.total})`}
            </span>
          </div>

          <button
            onClick={handleExportCSV}
            className={`flex items-center justify-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 font-semibold text-xs md:text-sm w-full sm:w-auto ${language === 'AR' ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t.actions.export}</span>
            <span className="sm:hidden">{t.actions.export}</span>
          </button>
        </div>
      </div>

      {isSearching ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 text-lg">{t.messages.loading}</p>
        </div>
      ) : filteredAndSortedClients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-12 text-center">
          <p className="text-gray-500 text-base md:text-lg">
            {clients.length === 0
              ? t.emptyStates.noClientsMessage
              : t.emptyStates.noClientsFilter}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{t.fields.name}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{t.fields.phoneNumber}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{t.fields.destination}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{t.fields.country}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{t.fields.status}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{t.fields.price}</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">{t.actions.edit}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedClients.map((client) => (
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
            {paginatedClients.map((client) => (
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
                    {t.actions.viewDetails}
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

          {totalPages > 1 && (
            <div className="bg-white rounded-xl shadow-lg p-4 mt-4">
              <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${language === 'AR' ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full sm:w-auto ${language === 'AR' ? 'flex-row-reverse' : ''}`}
                >
                  {language === 'AR' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                  {t.pagination.previous}
                </button>

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageClick(page as number)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full sm:w-auto ${language === 'AR' ? 'flex-row-reverse' : ''}`}
                >
                  {language === 'AR' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  {t.pagination.next}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
