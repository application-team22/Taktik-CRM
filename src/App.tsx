import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Client, ClientFormData } from './types/client';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ClientListEnhanced from './components/ClientListEnhanced';
import ClientForm from './components/ClientForm';
import ClientNotes from './components/ClientNotes';
import TasksView from './components/TasksView';
import AdminPanel from './components/AdminPanel';

type View = 'dashboard' | 'clients' | 'tasks' | 'admin';

function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [notesClient, setNotesClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (formData: ClientFormData) => {
    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingClient.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([formData]);

        if (error) throw error;
      }

      await fetchClients();
      setShowForm(false);
      setEditingClient(null);
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client. Please try again.');
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  const handleViewNotes = (client: Client) => {
    setNotesClient(client);
  };

  const handleCloseNotes = () => {
    setNotesClient(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentView={view} onNavigate={(newView) => setView(newView as View)} />

      <div className="flex-1 ml-64">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {view === 'dashboard' && 'Dashboard'}
                {view === 'clients' && 'Clients'}
                {view === 'tasks' && 'Tasks & Reminders'}
                {view === 'admin' && 'Admin Panel'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {view === 'dashboard' && 'Welcome to Taktik CRM'}
                {view === 'clients' && 'Manage your travel agency client database'}
                {view === 'tasks' && 'Track follow-ups and client tasks'}
                {view === 'admin' && 'System management and analytics'}
              </p>
            </div>
            {view === 'clients' && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
              >
                <Plus className="w-5 h-5" />
                Add Client
              </button>
            )}
          </div>
        </header>

        <main className="px-8 py-6">
          {view === 'dashboard' && <Dashboard clients={clients} />}
          {view === 'clients' && (
            <ClientListEnhanced
              clients={clients}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
              onViewNotes={handleViewNotes}
            />
          )}
          {view === 'tasks' && <TasksView />}
          {view === 'admin' && <AdminPanel clients={clients} />}
        </main>
      </div>

      {showForm && (
        <ClientForm
          client={editingClient}
          onSave={handleSaveClient}
          onClose={handleCloseForm}
        />
      )}

      {notesClient && (
        <ClientNotes client={notesClient} onClose={handleCloseNotes} />
      )}
    </div>
  );
}

export default App;
