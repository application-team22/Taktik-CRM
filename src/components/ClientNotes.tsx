import { useState, useEffect } from 'react';
import { X, Plus, Clock } from 'lucide-react';
import { Client } from '../types/client';
import { Note } from '../types/note';
import { supabase } from '../lib/supabase';
import Toast from './Toast';

interface ClientNotesProps {
  client: Client;
  onClose: () => void;
}

export default function ClientNotes({ client, onClose }: ClientNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchNotes();
  }, [client.id]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      setToast({ message: 'Please enter a note', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('notes')
        .insert([{ client_id: client.id, content: newNote.trim() }]);

      if (error) throw error;

      setNewNote('');
      setToast({ message: 'Note added successfully!', type: 'success' });
      await fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      setToast({ message: 'Failed to add note. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold">Notes for {client.name}</h2>
            <p className="text-blue-100 text-sm mt-1">
              {client.destination} • {client.country}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-blue-800 rounded-lg transition-all duration-200 hover:scale-110"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add New Note
            </label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter your note here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
              rows={3}
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || saving}
              className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 font-semibold"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Adding...' : 'Add Note'}
            </button>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Note History ({notes.length})
            </h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                <p className="text-gray-500">No notes yet. Add your first note above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(note.created_at)}</span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-800 py-2.5 px-4 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 hover:scale-105"
          >
            Close
          </button>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
