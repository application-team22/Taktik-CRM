import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Client, ClientFormData, ClientStatus } from '../types/client';

interface ClientFormProps {
  client: Client | null;
  onSave: (data: ClientFormData) => void;
  onClose: () => void;
}

const STATUS_OPTIONS: ClientStatus[] = [
  'New Lead',
  'Contacted',
  'Interested',
  'Not Interested',
  'Booked',
];

export default function ClientForm({ client, onSave, onClose }: ClientFormProps) {
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

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ClientFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    }
    if (!formData.destination.trim()) {
      newErrors.destination = 'Destination is required';
    }
    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }
    if (formData.price < 0) {
      newErrors.price = 'Price must be a positive number';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {client ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter client name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.phone_number ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone_number && <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>}
          </div>

          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
              Destination <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.destination ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Paris, France"
            />
            {errors.destination && <p className="mt-1 text-sm text-red-600">{errors.destination}</p>}
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.country ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Client's home country"
            />
            {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price
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
                className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {client ? 'Update Client' : 'Add Client'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
