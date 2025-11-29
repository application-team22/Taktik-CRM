import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Phone, Mail, Search, X, Eye, EyeOff, Shield, Power, Key, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

interface Agent {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AgentFormData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
}

interface AuditLog {
  id: string;
  action_type: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  admin_id: string;
}

interface AgentManagementProps {
  language?: 'EN' | 'AR';
}

export default function AgentManagement({ language = 'EN' }: AgentManagementProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AgentFormData | 'newPassword' | 'confirmPassword' | 'newEmail', string>>>({});
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
      console.log('Fetching agents...');
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'agent')
        .order('created_at', { ascending: false });

      console.log('Agents fetched:', { data, error });
      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setToast({ message: 'Failed to load agents', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (agentId: string) => {
    try {
      console.log('Fetching audit logs for agent:', agentId);
      const { data, error } = await supabase
        .from('agent_audit_logs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('Audit logs fetched:', { data, error });
      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setToast({ message: 'Failed to load audit logs', type: 'error' });
    }
  };

  const logAuditAction = async (
    agentId: string,
    actionType: string,
    fieldChanged?: string,
    oldValue?: string,
    newValue?: string
  ) => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.error('No current user found for audit logging');
        return;
      }

      console.log('Logging audit action:', { agentId, actionType, fieldChanged, oldValue, newValue });

      const { error } = await supabase.from('agent_audit_logs').insert([
        {
          admin_id: currentUser.id,
          agent_id: agentId,
          action_type: actionType,
          field_changed: fieldChanged || null,
          old_value: oldValue || null,
          new_value: newValue || null,
        },
      ]);

      if (error) {
        console.error('Error logging audit action:', error);
      } else {
        console.log('Audit action logged successfully');
      }
    } catch (error) {
      console.error('Error in logAuditAction:', error);
    }
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Invalid email format';
    }
    return null;
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof AgentFormData, string>> = {};

    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;

    if (!editingAgent) {
      if (!formData.password.trim()) {
        errors.password = 'Password is required';
      } else {
        const passwordError = validatePassword(formData.password);
        if (passwordError) errors.password = passwordError;
      }
    } else if (formData.password.trim()) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) errors.password = passwordError;
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
      console.log('=== AGENT SAVE OPERATION START ===');
      console.log('Form data:', formData);

      if (editingAgent) {
        console.log('Updating agent:', editingAgent.id);
        const updates: any = {
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          updated_at: new Date().toISOString(),
        };

        if (formData.password.trim()) {
          updates.password_hash = formData.password;
        }

        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', editingAgent.id)
          .select();

        console.log('Update response:', { data, error });
        if (error) throw error;

        if (formData.full_name !== editingAgent.full_name) {
          await logAuditAction(editingAgent.id, 'update', 'full_name', editingAgent.full_name, formData.full_name);
        }
        if (formData.email !== editingAgent.email) {
          await logAuditAction(editingAgent.id, 'email_change', 'email', editingAgent.email, formData.email);
        }
        if (formData.phone !== editingAgent.phone) {
          await logAuditAction(editingAgent.id, 'update', 'phone', editingAgent.phone || '', formData.phone || '');
        }
        if (formData.password.trim()) {
          await logAuditAction(editingAgent.id, 'password_change');
        }

        setToast({ message: 'Agent updated successfully!', type: 'success' });
      } else {
        console.log('Creating new agent...');
        const { data, error } = await supabase
          .from('users')
          .insert([
            {
              email: formData.email,
              password_hash: formData.password,
              full_name: formData.full_name,
              phone: formData.phone || null,
              role: 'agent',
              is_active: true,
            },
          ])
          .select();

        console.log('Insert response:', { data, error });
        if (error) throw error;

        if (data && data[0]) {
          await logAuditAction(data[0].id, 'create');
        }

        setToast({ message: 'Agent created successfully!', type: 'success' });
      }

      await fetchAgents();
      handleCloseForm();
      console.log('=== AGENT SAVE OPERATION COMPLETE ===');
    } catch (error: any) {
      console.error('=== AGENT SAVE OPERATION FAILED ===');
      console.error('Error:', error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        setToast({ message: 'An agent with this email already exists', type: 'error' });
      } else {
        setToast({ message: error.message || 'Failed to save agent. Please try again.', type: 'error' });
      }
    }
  };

  const handlePasswordChange = async () => {
    if (!selectedAgent) return;

    const errors: any = {};
    if (!newPassword.trim()) {
      errors.newPassword = 'New password is required';
    } else {
      const passwordError = validatePassword(newPassword);
      if (passwordError) errors.newPassword = passwordError;
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setConfirmDialog({
      show: true,
      title: 'Change Password',
      message: `Are you sure you want to change the password for ${selectedAgent.full_name}?`,
      onConfirm: async () => {
        try {
          console.log('Changing password for agent:', selectedAgent.id);
          const { error } = await supabase
            .from('users')
            .update({
              password_hash: newPassword,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedAgent.id);

          if (error) throw error;

          await logAuditAction(selectedAgent.id, 'password_change');
          setToast({ message: 'Password changed successfully!', type: 'success' });
          setShowPasswordModal(false);
          setNewPassword('');
          setConfirmPassword('');
          setFormErrors({});
          await fetchAgents();
        } catch (error: any) {
          console.error('Error changing password:', error);
          setToast({ message: error.message || 'Failed to change password', type: 'error' });
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleEmailChange = async () => {
    if (!selectedAgent) return;

    const emailError = validateEmail(newEmail);
    if (emailError) {
      setFormErrors({ newEmail: emailError });
      return;
    }

    if (newEmail === selectedAgent.email) {
      setFormErrors({ newEmail: 'New email must be different from current email' });
      return;
    }

    setConfirmDialog({
      show: true,
      title: 'Change Email',
      message: `Are you sure you want to change the email for ${selectedAgent.full_name} from ${selectedAgent.email} to ${newEmail}?`,
      onConfirm: async () => {
        try {
          console.log('Changing email for agent:', selectedAgent.id);
          const { error } = await supabase
            .from('users')
            .update({
              email: newEmail,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedAgent.id);

          if (error) {
            if (error.message?.includes('duplicate') || error.code === '23505') {
              throw new Error('An agent with this email already exists');
            }
            throw error;
          }

          await logAuditAction(selectedAgent.id, 'email_change', 'email', selectedAgent.email, newEmail);
          setToast({ message: 'Email changed successfully!', type: 'success' });
          setShowEmailModal(false);
          setNewEmail('');
          setFormErrors({});
          await fetchAgents();
        } catch (error: any) {
          console.error('Error changing email:', error);
          setToast({ message: error.message || 'Failed to change email', type: 'error' });
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleToggleActive = async (agent: Agent) => {
    const action = agent.is_active ? 'deactivate' : 'activate';
    const actionText = agent.is_active ? 'Deactivate' : 'Activate';

    setConfirmDialog({
      show: true,
      title: `${actionText} Agent`,
      message: `Are you sure you want to ${action} ${agent.full_name}? ${agent.is_active ? 'They will not be able to log in.' : 'They will be able to log in again.'}`,
      onConfirm: async () => {
        try {
          console.log(`${actionText}ing agent:`, agent.id);
          const { error } = await supabase
            .from('users')
            .update({
              is_active: !agent.is_active,
              updated_at: new Date().toISOString()
            })
            .eq('id', agent.id);

          if (error) throw error;

          await logAuditAction(agent.id, action);
          setToast({ message: `Agent ${action}d successfully!`, type: 'success' });
          await fetchAgents();
        } catch (error: any) {
          console.error(`Error ${action}ing agent:`, error);
          setToast({ message: error.message || `Failed to ${action} agent`, type: 'error' });
        } finally {
          setConfirmDialog(null);
        }
      },
    });
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

  const handleChangePassword = (agent: Agent) => {
    setSelectedAgent(agent);
    setNewPassword('');
    setConfirmPassword('');
    setFormErrors({});
    setShowPasswordModal(true);
  };

  const handleChangeEmail = (agent: Agent) => {
    setSelectedAgent(agent);
    setNewEmail(agent.email);
    setFormErrors({});
    setShowEmailModal(true);
  };

  const handleViewAuditLog = (agent: Agent) => {
    setSelectedAgent(agent);
    fetchAuditLogs(agent.id);
    setShowAuditModal(true);
  };

  const handleDelete = (agent: Agent) => {
    setConfirmDialog({
      show: true,
      title: 'Delete Agent',
      message: `Are you sure you want to delete ${agent.full_name}? This action cannot be undone and will remove all associated data.`,
      onConfirm: async () => {
        try {
          console.log('Deleting agent:', agent.id);
          await logAuditAction(agent.id, 'delete');

          const { error } = await supabase.from('users').delete().eq('id', agent.id);

          if (error) throw error;
          setToast({ message: 'Agent deleted successfully!', type: 'success' });
          await fetchAgents();
        } catch (error: any) {
          console.error('Error deleting agent:', error);
          setToast({ message: error.message || 'Failed to delete agent', type: 'error' });
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
      password_change: 'Password Changed',
      email_change: 'Email Changed',
      activate: 'Activated',
      deactivate: 'Deactivated',
      role_change: 'Role Changed',
    };
    return labels[actionType] || actionType;
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
          <p className="text-gray-600 text-sm mt-1">Full control over agent accounts and permissions</p>
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
                    <th className="px-6 py-4 text-left text-sm font-semibold">Agent</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Contact</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Created</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-blue-50 transition-all duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${agent.is_active ? 'bg-blue-100' : 'bg-gray-100'} rounded-full flex items-center justify-center`}>
                            <Users className={`w-5 h-5 ${agent.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <span className={`font-medium ${agent.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                              {agent.full_name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Shield className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500 capitalize">{agent.role}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
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
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            agent.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {agent.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatDate(agent.created_at)}</td>
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
                            onClick={() => handleChangePassword(agent)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Change password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleChangeEmail(agent)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Change email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(agent)}
                            className={`p-2 ${agent.is_active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'} rounded-lg transition-all duration-200 hover:scale-110`}
                            title={agent.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleViewAuditLog(agent)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="View audit log"
                          >
                            <History className="w-4 h-4" />
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
                  className={`rounded-xl border-2 p-4 hover:shadow-md transition-all duration-200 ${
                    agent.is_active
                      ? 'bg-white border-gray-200 hover:border-blue-300'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${agent.is_active ? 'bg-blue-100' : 'bg-gray-100'} rounded-full flex items-center justify-center`}>
                        <Users className={`w-6 h-6 ${agent.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <h4 className={`font-semibold ${agent.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                          {agent.full_name}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            agent.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {agent.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
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
                    <div className="text-xs text-gray-500">Created: {formatDate(agent.created_at)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                    <button
                      onClick={() => handleEdit(agent)}
                      className="flex items-center justify-center gap-2 py-2 px-3 text-blue-600 bg-blue-50 rounded-lg font-medium hover:bg-blue-100 transition-all duration-200"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleChangePassword(agent)}
                      className="flex items-center justify-center gap-2 py-2 px-3 text-purple-600 bg-purple-50 rounded-lg font-medium hover:bg-purple-100 transition-all duration-200"
                    >
                      <Key className="w-4 h-4" />
                      Password
                    </button>
                    <button
                      onClick={() => handleToggleActive(agent)}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all duration-200 ${
                        agent.is_active
                          ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                          : 'text-green-600 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                      {agent.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleViewAuditLog(agent)}
                      className="flex items-center justify-center gap-2 py-2 px-3 text-gray-600 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
                    >
                      <History className="w-4 h-4" />
                      Audit
                    </button>
                    <button
                      onClick={() => handleDelete(agent)}
                      className="col-span-2 flex items-center justify-center gap-2 py-2 px-3 text-red-600 bg-red-50 rounded-lg font-medium hover:bg-red-100 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Agent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-blue-800">
            <strong>Total Agents:</strong> {agents.length}
            {searchTerm && ` (${filteredAgents.length} matching search)`}
          </p>
          <p className="text-sm text-blue-800">
            <strong>Active:</strong> {agents.filter(a => a.is_active).length} |
            <strong className="ml-2">Inactive:</strong> {agents.filter(a => !a.is_active).length}
          </p>
        </div>
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
                    placeholder={editingAgent ? 'Enter new password' : 'Min 8 chars, 1 uppercase, 1 number'}
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
                {!editingAgent && (
                  <p className="mt-1 text-xs text-gray-500">
                    Must be 8+ characters with uppercase, lowercase, and number
                  </p>
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
                  {editingAgent ? 'Update Agent' : 'Create Agent'}
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

      {showPasswordModal && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-5 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6" />
                <h2 className="text-xl font-bold">Change Password</h2>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setFormErrors({});
                }}
                className="p-1.5 hover:bg-purple-800 rounded-lg transition-all duration-200 hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-900">
                  <strong>Agent:</strong> {selectedAgent.full_name}
                </p>
                <p className="text-sm text-purple-800">{selectedAgent.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (formErrors.newPassword) setFormErrors({ ...formErrors, newPassword: undefined });
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                    formErrors.newPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter new password"
                />
                {formErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.newPassword}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Must be 8+ characters with uppercase, lowercase, and number
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (formErrors.confirmPassword) setFormErrors({ ...formErrors, confirmPassword: undefined });
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                    formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirm new password"
                />
                {formErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-password"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="show-password" className="text-sm text-gray-700">
                  Show passwords
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handlePasswordChange}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2.5 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-105"
                >
                  Change Password
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setFormErrors({});
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2.5 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-5 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6" />
                <h2 className="text-xl font-bold">Change Email</h2>
              </div>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setNewEmail('');
                  setFormErrors({});
                }}
                className="p-1.5 hover:bg-orange-800 rounded-lg transition-all duration-200 hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-900">
                  <strong>Agent:</strong> {selectedAgent.full_name}
                </p>
                <p className="text-sm text-orange-800">
                  <strong>Current Email:</strong> {selectedAgent.email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (formErrors.newEmail) setFormErrors({ ...formErrors, newEmail: undefined });
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 ${
                    formErrors.newEmail ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="newemail@taktiktravel.com"
                />
                {formErrors.newEmail && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.newEmail}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  The agent will use this email for future logins
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleEmailChange}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white py-2.5 px-6 rounded-xl font-semibold hover:from-orange-700 hover:to-orange-800 transition-all duration-200 shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-105"
                >
                  Change Email
                </button>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setNewEmail('');
                    setFormErrors({});
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2.5 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAuditModal && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white px-6 py-5 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6" />
                <h2 className="text-xl font-bold">Audit Log</h2>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1.5 hover:bg-gray-900 rounded-lg transition-all duration-200 hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-900">
                  <strong>Agent:</strong> {selectedAgent.full_name}
                </p>
                <p className="text-sm text-gray-700">{selectedAgent.email}</p>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No audit logs found</p>
                  <p className="text-sm text-gray-500 mt-1">Actions performed on this agent will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between mb-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                          {getActionTypeLabel(log.action_type)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      {log.field_changed && (
                        <div className="text-sm text-gray-700">
                          <strong>Field:</strong> {log.field_changed}
                        </div>
                      )}
                      {log.old_value && (
                        <div className="text-sm text-gray-600 mt-1">
                          <strong>Old Value:</strong> {log.old_value}
                        </div>
                      )}
                      {log.new_value && (
                        <div className="text-sm text-gray-600 mt-1">
                          <strong>New Value:</strong> {log.new_value}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
