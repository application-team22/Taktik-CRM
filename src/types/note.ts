export interface Note {
  id: string;
  client_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NoteFormData {
  client_id: string;
  content: string;
}
