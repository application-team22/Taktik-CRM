import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Client, ClientFormData, ClientStatus } from '../types/client';
import { translations } from '../lib/translations';

interface ClientFormProps {
  client: Client | null;
  onSave: (data: ClientFormData) => void;
  onClose: () => void;
  language: 'EN' | 'AR';
}

const STATUS_OPTIONS: ClientStatus[] = [
  'New Lead',
  'Contacted',
  'Interested',
  'Not Interested',
  'Booked',
];

export default function ClientForm({ client, onSave, onClose, language }: ClientFormProps) {
  const t = translations[language];
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    phone_number: '',
    destination: '',
    status: 'New Lead',
    price: 0,
    country: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        phone_number: client.phone_number,
        destination: client.destination,
        status: client.status,
        price: client.price,
        country: client.country,
      });
    }
  }, [client]);

  const getStatusTranslation = (status: ClientStatus) => {
    const statusMap: Record<ClientStatus, keyof typeof t.statuses> = {
      'New Lead': 'newLead',
      'Contacted': 'contacted',
      'Interested': 'interested',
      'Not Interested': 'notInterested',
      'Booked': 'booked',
    };
    return t.statuses[statusMap[status]];
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ClientFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = `${t.fields.name} is required`;
    }
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = `${t.fields.phoneNumber} is required`;
    }
    if (!formData.destination.trim()) {
      newErrors.destination = `${t.fields.destination} is required`;
    }
    if (!formData.country.trim()) {
      newErrors.country = `${t.fields.country} is required`;
    }
    if (formData.price < 0) {
      newErrors.price = `${t.fields.price} must be a positive number`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value,
    }));
    if (errors[name as keyof ClientFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 md:px-6 py-4 md:py-5 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg md:text-xl font-bold">
            {client ? `${t.actions.edit} ${t.navigation.clients}` : t.actions.addClient}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-blue-800 rounded-lg transition-all duration-200 hover:scale-110 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              {t.fields.name} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 md:py-2.5 border rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t.placeholders.enterClientName}
            />
            {errors.name && <p className="mt-1 text-xs md:text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="phone_number" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              {t.fields.phoneNumber} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className={`w-full px-4 py-3 md:py-2.5 border rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                errors.phone_number ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t.placeholders.enterPhoneNumber}
            />
            {errors.phone_number && <p className="mt-1 text-xs md:text-sm text-red-600">{errors.phone_number}</p>}
          </div>

          <div>
            <label htmlFor="destination" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              {t.fields.destination} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              className={`w-full px-4 py-3 md:py-2.5 border rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                errors.destination ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t.placeholders.enterDestination}
            />
            {errors.destination && <p className="mt-1 text-xs md:text-sm text-red-600">{errors.destination}</p>}
          </div>

          <div>
            <label htmlFor="country" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              {t.fields.country} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className={`w-full px-4 py-3 md:py-2.5 border rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                errors.country ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t.placeholders.enterCountry}
            />
            {errors.country && <p className="mt-1 text-xs md:text-sm text-red-600">{errors.country}</p>}
          </div>

          <div>
            <label htmlFor="status" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              {t.fields.status} <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-3 md:py-2.5 border border-gray-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getStatusTranslation(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="price" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              {t.fields.price}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full pl-8 pr-4 py-3 md:py-2.5 border rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t.placeholders.enterPrice}
              />
            </div>
            {errors.price && <p className="mt-1 text-xs md:text-sm text-red-600">{errors.price}</p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 md:px-6 rounded-xl font-semibold text-sm md:text-base hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105"
            >
              {client ? `${t.actions.edit} ${t.navigation.clients}` : t.actions.addClient}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 md:px-6 rounded-xl font-semibold text-sm md:text-base hover:bg-gray-300 transition-all duration-200 hover:scale-105"
            >
              {t.actions.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
