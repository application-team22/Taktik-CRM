import { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Client, ClientFormData } from './types/client';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList';
import ClientForm from './components/ClientForm';

type View = 'dashboard' | 'clients';

function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Taktik CRM</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setView('clients')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'clients'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Clients
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
              >
                <Plus className="w-5 h-5" />
                Add Client
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' ? (
          <Dashboard clients={clients} />
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">All Clients</h2>
              <p className="text-gray-600 mt-1">
                Manage your travel agency client database
              </p>
            </div>
            <ClientList
              clients={clients}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
            />
          </div>
        )}
      </main>

      {showForm && (
        <ClientForm
          client={editingClient}
          onSave={handleSaveClient}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

export default App;
