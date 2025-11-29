import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Phone, Mail, Search, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

interface Agent {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  created_at: string;
}

interface AgentFormData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
}

interface AgentManagementProps {
  language?: 'EN' | 'AR';
}

export default function AgentManagement({ language = 'EN' }: AgentManagementProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AgentFormData, string>>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'agent')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setToast({ message: 'Failed to load agents', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof AgentFormData, string>> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!editingAgent && !formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (!editingAgent && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (editingAgent) {
        const updates: any = {
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          updated_at: new Date().toISOString(),
        };

        if (formData.password.trim()) {
          updates.password_hash = formData.password;
        }

        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', editingAgent.id);

        if (error) throw error;
        setToast({ message: 'Agent updated successfully!', type: 'success' });
      } else {
        const { error } = await supabase.from('users').insert([
          {
            email: formData.email,
            password_hash: formData.password,
            full_name: formData.full_name,
            phone: formData.phone || null,
            role: 'agent',
          },
        ]);

        if (error) throw error;
        setToast({ message: 'Agent added successfully!', type: 'success' });
      }

      await fetchAgents();
      handleCloseForm();
    } catch (error: any) {
      console.error('Error saving agent:', error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        setToast({ message: 'An agent with this email already exists', type: 'error' });
      } else {
        setToast({ message: 'Failed to save agent. Please try again.', type: 'error' });
      }
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      email: agent.email,
      password: '',
      full_name: agent.full_name,
      phone: agent.phone || '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = (agent: Agent) => {
    setConfirmDialog({
      show: true,
      title: 'Delete Agent',
      message: `Are you sure you want to delete ${agent.full_name}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('users').delete().eq('id', agent.id);

          if (error) throw error;
          setToast({ message: 'Agent deleted successfully!', type: 'success' });
          await fetchAgents();
        } catch (error) {
          console.error('Error deleting agent:', error);
          setToast({ message: 'Failed to delete agent. Please try again.', type: 'error' });
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAgent(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
    });
    setFormErrors({});
    setShowPassword(false);
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.phone && agent.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Agent Management</h3>
          <p className="text-gray-600 text-sm mt-1">Manage sales agents and their permissions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Add Agent
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        {filteredAgents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium text-lg">
              {searchTerm ? 'No agents found matching your search' : 'No agents yet'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {searchTerm ? 'Try adjusting your search terms' : 'Click "Add Agent" to create your first agent'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Phone</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Added</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-blue-50 transition-all duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{agent.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {agent.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {agent.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {agent.phone}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not provided</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{formatDate(agent.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(agent)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Edit agent"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(agent)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Delete agent"
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

            <div className="md:hidden space-y-3">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{agent.full_name}</h4>
                        <p className="text-xs text-gray-500">{formatDate(agent.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {agent.email}
                    </div>
                    {agent.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {agent.phone}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <button
                      onClick={() => handleEdit(agent)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-blue-600 bg-blue-50 rounded-lg font-medium hover:bg-blue-100 transition-all duration-200"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(agent)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-red-600 bg-red-50 rounded-lg font-medium hover:bg-red-100 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Total Agents:</strong> {agents.length}
          {searchTerm && ` (${filteredAgents.length} matching search)`}
        </p>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 flex items-center justify-between rounded-t-2xl sticky top-0">
              <h2 className="text-xl font-bold">{editingAgent ? 'Edit Agent' : 'Add New Agent'}</h2>
              <button
                onClick={handleCloseForm}
                className="p-1.5 hover:bg-blue-800 rounded-lg transition-all duration-200 hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => {
                    setFormData({ ...formData, full_name: e.target.value });
                    if (formErrors.full_name) setFormErrors({ ...formErrors, full_name: undefined });
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    formErrors.full_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
                />
                {formErrors.full_name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) setFormErrors({ ...formErrors, email: undefined });
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="agent@taktiktravel.com"
                />
                {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {!editingAgent && <span className="text-red-500">*</span>}
                  {editingAgent && <span className="text-gray-500 text-xs">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (formErrors.password) setFormErrors({ ...formErrors, password: undefined });
                    }}
                    className={`w-full px-4 py-2.5 pr-12 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      formErrors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={editingAgent ? 'Enter new password' : 'Enter password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105"
                >
                  {editingAgent ? 'Update Agent' : 'Add Agent'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 bg-gray-200 text-gray-800 py-2.5 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} language={language} />}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          language={language}
        />
      )}
    </div>
  );
}
