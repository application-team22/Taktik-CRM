import { useState, useEffect } from 'react';
import { Plus, Calendar, CheckCircle, Circle, Clock, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Task, TaskFormData } from '../types/task';
import { Client } from '../types/client';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

interface TasksViewProps {
  language?: 'EN' | 'AR';
}

export default function TasksView({ language: _language = 'EN' }: TasksViewProps = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>({
    client_id: '',
    description: '',
    due_date: '',
    status: 'pending',
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksResponse, clientsResponse] = await Promise.all([
        supabase.from('tasks').select('*').order('due_date', { ascending: true }),
        supabase.from('clients').select('*').order('name', { ascending: true }),
      ]);

      if (tasksResponse.error) throw tasksResponse.error;
      if (clientsResponse.error) throw clientsResponse.error;

      setTasks(tasksResponse.data || []);
      setClients(clientsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id || !formData.description || !formData.due_date) {
      setToast({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    try {
      const { error } = await supabase.from('tasks').insert([formData]);

      if (error) throw error;

      setShowForm(false);
      setFormData({
        client_id: '',
        description: '',
        due_date: '',
        status: 'pending',
      });
      setToast({ message: 'Task created successfully!', type: 'success' });
      await fetchData();
    } catch (error) {
      console.error('Error creating task:', error);
      setToast({ message: 'Failed to create task. Please try again.', type: 'error' });
    }
  };

  const handleToggleStatus = async (task: Task) => {
    try {
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      const updates: Partial<Task> = {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id);

      if (error) throw error;
      setToast({
        message: newStatus === 'completed' ? 'Task marked as completed!' : 'Task marked as pending!',
        type: 'success'
      });
      await fetchData();
    } catch (error) {
      console.error('Error updating task:', error);
      setToast({ message: 'Failed to update task. Please try again.', type: 'error' });
    }
  };

  const handleDeleteTask = (id: string) => {
    setConfirmDialog({
      show: true,
      title: 'Delete Task',
      message: `Are you sure you want to delete this task? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('tasks').delete().eq('id', id);

          if (error) throw error;
          setToast({ message: 'Task deleted successfully!', type: 'success' });
          await fetchData();
        } catch (error) {
          console.error('Error deleting task:', error);
          setToast({ message: 'Failed to delete task. Please try again.', type: 'error' });
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status === 'pending' && new Date(dueDate) < new Date();
  };

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No Clients Yet</h2>
            <p className="text-gray-600 mb-6">
              You need to add clients before you can create tasks. Head over to the Clients section to add your first client.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Tasks & Reminders</h2>
          <p className="text-xs md:text-sm text-gray-600 mt-1 hidden sm:block">Manage follow-ups and client tasks</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 md:px-5 py-3 md:py-2.5 rounded-xl font-semibold text-sm md:text-base hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 p-4 md:p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-gray-600 text-xs md:text-sm font-medium">Pending Tasks</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-2">{pendingTasks.length}</p>
            </div>
            <div className="bg-yellow-100 p-2 md:p-3 rounded-xl shadow-md flex-shrink-0">
              <Clock className="w-5 md:w-6 h-5 md:h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 p-4 md:p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-gray-600 text-xs md:text-sm font-medium">Completed</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-2">{completedTasks.length}</p>
            </div>
            <div className="bg-green-100 p-2 md:p-3 rounded-xl shadow-md flex-shrink-0">
              <CheckCircle className="w-5 md:w-6 h-5 md:h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 p-4 md:p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-gray-600 text-xs md:text-sm font-medium">Overdue</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-2">
                {pendingTasks.filter((t) => isOverdue(t.due_date, t.status)).length}
              </p>
            </div>
            <div className="bg-red-100 p-2 md:p-3 rounded-xl shadow-md flex-shrink-0">
              <Calendar className="w-5 md:w-6 h-5 md:h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-800">Pending Tasks</h3>
        </div>
        <div className="p-4 md:p-6">
          {pendingTasks.length === 0 ? (
            <div className="text-center py-6 md:py-8 bg-gray-50 rounded-lg">
              <CheckCircle className="w-10 md:w-12 h-10 md:h-12 text-green-500 mx-auto mb-2 md:mb-3" />
              <p className="text-gray-700 font-medium text-sm md:text-base">No pending tasks</p>
              <p className="text-gray-500 text-xs md:text-sm mt-1">Great job! Click "Add Task" to create a new task.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 rounded-xl border-2 transition-all duration-200 ${
                    isOverdue(task.due_date, task.status)
                      ? 'bg-red-50 border-red-200 shadow-sm'
                      : 'bg-gradient-to-r from-gray-50 to-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleStatus(task)}
                      className="text-gray-400 hover:text-blue-600 transition-all duration-200 hover:scale-110 flex-shrink-0 mt-1 sm:mt-0"
                    >
                      <Circle className="w-5 sm:w-6 h-5 sm:h-6" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm md:text-base break-words">{task.description}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs md:text-sm text-gray-600">
                        <span className="font-medium">{getClientName(task.client_id)}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          {formatDate(task.due_date)}
                          {isOverdue(task.due_date, task.status) && (
                            <span className="ml-2 text-red-600 font-medium">Overdue</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {completedTasks.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200">
            <h3 className="text-base md:text-lg font-semibold text-gray-800">Completed Tasks</h3>
          </div>
          <div className="p-4 md:p-6">
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-green-50 rounded-xl border-2 border-green-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleStatus(task)}
                      className="text-green-600 hover:text-gray-400 transition-all duration-200 hover:scale-110 flex-shrink-0 mt-1 sm:mt-0"
                    >
                      <CheckCircle className="w-5 sm:w-6 h-5 sm:h-6" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 line-through text-sm md:text-base break-words">{task.description}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs md:text-sm text-gray-600">
                        <span className="font-medium">{getClientName(task.client_id)}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          Completed {task.completed_at && formatDate(task.completed_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 md:px-6 py-4 md:py-5 flex items-center justify-between rounded-t-2xl sticky top-0">
              <h2 className="text-lg md:text-xl font-bold">Add New Task</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 hover:bg-blue-800 rounded-lg transition-all duration-200 hover:scale-110 flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-4 py-3 md:py-2.5 border border-gray-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Task Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 md:py-2.5 border border-gray-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                  rows={3}
                  placeholder="e.g., Follow up on Paris booking"
                  required
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-3 md:py-2.5 border border-gray-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 md:px-6 rounded-xl font-semibold text-sm md:text-base hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 md:px-6 rounded-xl font-semibold text-sm md:text-base hover:bg-gray-300 transition-all duration-200 hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
