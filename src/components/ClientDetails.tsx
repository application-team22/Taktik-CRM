import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Plus, Phone, MapPin, Globe, DollarSign, Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { Client } from '../types/client';
import { Note } from '../types/note';
import { Task } from '../types/task';
import { supabase } from '../lib/supabase';
import Breadcrumb from './Breadcrumb';

interface ClientDetailsProps {
  client: Client;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onAddNote: () => void;
  onAddTask: () => void;
}

export default function ClientDetails({
  client,
  onClose,
  onEdit,
  onDelete,
  onAddNote,
  onAddTask,
}: ClientDetailsProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientData();
  }, [client.id]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const [notesResponse, tasksResponse] = await Promise.all([
        supabase
          .from('notes')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('tasks')
          .select('*')
          .eq('client_id', client.id)
          .order('due_date', { ascending: true }),
      ]);

      if (notesResponse.error) throw notesResponse.error;
      if (tasksResponse.error) throw tasksResponse.error;

      setNotes(notesResponse.data || []);
      setTasks(tasksResponse.data || []);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatTaskDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status === 'pending' && new Date(dueDate) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 flex items-center justify-between rounded-t-2xl">
          <div className="flex-1">
            <Breadcrumb
              items={[
                { label: 'Dashboard', onClick: onClose },
                { label: 'Clients', onClick: onClose },
                { label: client.name },
              ]}
            />
            <h2 className="text-2xl font-bold">{client.name}</h2>
            <span
              className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border mt-2 ${getStatusColor(
                client.status
              )}`}
            >
              {client.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-blue-800 rounded-lg transition-all duration-200 hover:scale-110"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Client Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                      <p className="font-semibold text-gray-900">{client.phone_number}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Destination</p>
                      <p className="font-semibold text-gray-900">{client.destination}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Country</p>
                      <p className="font-semibold text-gray-900">{client.country}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Price</p>
                      <p className="font-semibold text-gray-900">{formatPrice(client.price)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Created</p>
                      <p className="font-semibold text-gray-900">
                        {formatTaskDate(client.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Last Updated</p>
                      <p className="font-semibold text-gray-900">
                        {formatTaskDate(client.updated_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Notes ({notes.length})</h3>
                  <button
                    onClick={onAddNote}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    Add Note
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No notes yet. Add your first note to track interactions.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-all duration-200"
                      >
                        <p className="text-xs text-gray-500 mb-2">{formatDate(note.created_at)}</p>
                        <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => onEdit(client)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all duration-200 font-semibold"
                  >
                    <Edit2 className="w-5 h-5" />
                    Edit Client
                  </button>
                  <button
                    onClick={onAddNote}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all duration-200 font-semibold"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Add Note
                  </button>
                  <button
                    onClick={onAddTask}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-all duration-200 font-semibold"
                  >
                    <CheckSquare className="w-5 h-5" />
                    Create Task
                  </button>
                  <button
                    onClick={() => onDelete(client.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all duration-200 font-semibold"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Client
                  </button>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Tasks ({tasks.length})</h3>
                  <button
                    onClick={onAddTask}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No tasks scheduled for this client.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg border-2 ${
                          task.status === 'completed'
                            ? 'bg-green-50 border-green-200'
                            : isOverdue(task.due_date, task.status)
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'
                          }`}
                        >
                          {task.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {formatTaskDate(task.due_date)}
                          {isOverdue(task.due_date, task.status) && (
                            <span className="ml-2 text-red-600 font-semibold">Overdue</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 hover:scale-105"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
