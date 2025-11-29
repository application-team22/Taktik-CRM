import { useState, useEffect } from 'react';
import { Plus, Menu } from 'lucide-react';
import { supabase } from './lib/supabase';
import { translations } from './lib/translations';
import { Client, ClientFormData } from './types/client';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ClientListEnhanced from './components/ClientListEnhanced';
import ClientForm from './components/ClientForm';
import ClientNotes from './components/ClientNotes';
import TasksView from './components/TasksView';
import AdminPanel from './components/AdminPanel';
import ClientDetails from './components/ClientDetails';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import LanguageSwitcher from './components/LanguageSwitcher';

type View = 'dashboard' | 'clients' | 'tasks' | 'admin';

function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [notesClient, setNotesClient] = useState<Client | null>(null);
  const [detailsClient, setDetailsClient] = useState<Client | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'AR'>(() => {
    const saved = localStorage.getItem('language');
    return (saved as 'EN' | 'AR') || 'EN';
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const fetchClients = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
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
      setRefreshing(false);
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
        setToast({ message: t.messages.clientUpdatedSuccess, type: 'success' });
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([formData]);

        if (error) throw error;
        setToast({ message: t.messages.clientAddedSuccess, type: 'success' });
      }

      await fetchClients(true);
      setShowForm(false);
      setEditingClient(null);
    } catch (error) {
      console.error('Error saving client:', error);
      setToast({ message: 'Failed to save client. Please try again.', type: 'error' });
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDeleteClient = (id: string) => {
    const client = clients.find(c => c.id === id);
    setConfirmDialog({
      show: true,
      title: 'Delete Client',
      message: `${t.messages.confirmDeleteClient} This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

          if (error) throw error;
          setToast({ message: t.messages.clientDeletedSuccess, type: 'success' });
          await fetchClients(true);
          setDetailsClient(null);
        } catch (error) {
          console.error('Error deleting client:', error);
          setToast({ message: 'Failed to delete client. Please try again.', type: 'error' });
        } finally {
          setConfirmDialog(null);
        }
      },
    });
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

  const handleViewDetails = (client: Client) => {
    setDetailsClient(client);
  };

  const handleCloseDetails = () => {
    setDetailsClient(null);
  };

  const handleAddNoteFromDetails = () => {
    if (detailsClient) {
      setNotesClient(detailsClient);
      setDetailsClient(null);
    }
  };

  const handleAddTaskFromDetails = () => {
    setDetailsClient(null);
    setView('tasks');
  };

  const t = translations[language];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.messages.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      <Sidebar
        currentView={view}
        onNavigate={(newView) => {
          setView(newView as View);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        language={language}
      />

      <div className="flex-1 md:ml-64">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
          <div className="px-4 md:px-8 py-4 md:py-5 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {view === 'dashboard' && t.header.dashboardTitle}
                {view === 'clients' && t.header.clientsTitle}
                {view === 'tasks' && t.header.tasksTitle}
                {view === 'admin' && t.header.adminTitle}
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium hidden sm:block">
                {view === 'dashboard' && t.header.dashboardSubtitle}
                {view === 'clients' && t.header.clientsSubtitle}
                {view === 'tasks' && t.header.tasksSubtitle}
                {view === 'admin' && t.header.adminSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher language={language} onLanguageChange={setLanguage} />
              {view === 'clients' && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:scale-105"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">{t.actions.addClient}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 md:px-8 py-4 md:py-6">
          {refreshing && (
            <div className="fixed top-20 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-30">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span className="text-sm font-medium">Updating...</span>
            </div>
          )}
          {view === 'dashboard' && <Dashboard clients={clients} language={language} />}
          {view === 'clients' && (
            <ClientListEnhanced
              clients={clients}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
              onViewNotes={handleViewNotes}
              onViewDetails={handleViewDetails}
              language={language}
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
          language={language}
        />
      )}

      {notesClient && (
        <ClientNotes client={notesClient} onClose={handleCloseNotes} />
      )}

      {detailsClient && (
        <ClientDetails
          client={detailsClient}
          onClose={handleCloseDetails}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
          onAddNote={handleAddNoteFromDetails}
          onAddTask={handleAddTaskFromDetails}
        />
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

export default App;
