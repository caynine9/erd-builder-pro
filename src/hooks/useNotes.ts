import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Note, DraftType } from '../types';
import { localPersistence } from '../lib/localPersistence';

export function useNotes(isGuest: boolean = false) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isItemLoading, setIsItemLoading] = useState(false);

  const [notesTotal, setNotesTotal] = useState(0);
  const [hasMoreNotes, setHasMoreNotes] = useState(false);
  const notesRef = useRef<Note[]>(notes);

  // Keep ref in sync
  notesRef.current = notes;

  const fetchNotes = useCallback(async (isLoadMore = false, projectId: number | null | string = 'all', searchQuery = '', isPublic: boolean | null = null, limit = 10, options?: { silent?: boolean }) => {
    if (isGuest) {
      const localNotes = await localPersistence.getAllResources('notes');
      let filtered = localNotes.filter(n => !n.is_deleted);
      if (projectId !== 'all') {
        filtered = filtered.filter(n => n.project_id === projectId);
      }
      if (searchQuery) {
        filtered = filtered.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      setNotes(filtered);
      setNotesTotal(filtered.length);
      setHasMoreNotes(false);
      return;
    }

    if (!options?.silent) setIsLoading(true);
    try {
      const offset = isLoadMore ? notesRef.current.length : 0;
      const projIdParam = (projectId === null || projectId === 'null' || projectId === 'none') ? 'null' : projectId;
      const qParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
      const publicParam = isPublic !== null ? `&is_public=${isPublic}` : '';
      const res = await fetch(`/api/notes?limit=${limit}&offset=${offset}&project_id=${projIdParam}${qParam}${publicParam}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data !== undefined ? json.data : (Array.isArray(json) ? json : []);
        const total = json.total !== undefined ? json.total : (Array.isArray(data) ? data.length : 0);
        
        const notesListData = Array.isArray(data) ? data : [];
        if (isLoadMore) {
          setNotes(prev => [...prev, ...notesListData]);
        } else {
          setNotes(notesListData);
        }
        setNotesTotal(total);
        setHasMoreNotes((notesListData.length + offset) < total);
      } else {
        const errText = await res.text();
        console.error(`Failed to fetch notes: ${res.status} ${res.statusText}`, errText);
      }
    } catch (err) {
      console.error('Error in fetchNotes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isGuest]); 

  const createNote = async (title: string, projectId?: number | string | null, content?: string) => {
    const effectiveProjectId = (projectId === 'none' || projectId === 'uncategorized') ? null : projectId;

    if (isGuest) {
      const newNote: Note = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        content: content || '',
        project_id: effectiveProjectId || null,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      // @ts-ignore
      newNote.type = 'notes';
      await localPersistence.saveResource(newNote);
      setNotes(prev => [newNote, ...prev]);
      toast.success('Note created locally');
      return newNote;
    }

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, project_id: effectiveProjectId, content: content || "" }),
      });
      if (res.ok) {
        const newNote = await res.json();
        setNotes(prev => [newNote, ...prev]);
        toast.success('Note created successfully');
        return newNote;
      }
    } catch (err) {
      console.error('Error creating note:', err);
    }
    return null;
  };

  const duplicateNote = async (id: number | string, newTitle: string) => {
    const sourceNote = notesRef.current.find(n => String(n.id) === String(id));
    if (!sourceNote) {
      toast.error('Source note not found');
      return null;
    }

    // Load full content if it's not in the list (though usually it is if it's active)
    let content = sourceNote.content;
    
    // If it's the active note, we might have unsaved changes in local draft
    const draft = await localPersistence.getDraft(DraftType.NOTES, id);
    if (draft) {
      try {
        const parsed = JSON.parse(draft.data);
        if (parsed.content) content = parsed.content;
      } catch (e) {}
    }

    return await createNote(newTitle, sourceNote.project_id, content);
  };

  const updateNote = async (id: number | string, title: string, options?: { silent?: boolean }) => {
    if (isGuest) {
      const note = await localPersistence.getResource(id);
      if (note) {
        note.title = title;
        note.updated_at = new Date().toISOString();
        await localPersistence.saveResource(note);
        setNotes(prev => prev.map(n => n.id === id ? { ...n, title } : n));
        if (!options?.silent) toast.success('Note renamed locally');
      }
      return;
    }

    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, title } : n));
        if (!options?.silent) toast.success('Note renamed successfully');
      }
    } catch (err) {}
  };

  const deleteNote = async (id: number | string) => {
    if (isGuest) {
      const note = await localPersistence.getResource(id);
      if (note) {
        note.is_deleted = true;
        note.deleted_at = new Date().toISOString();
        await localPersistence.saveResource(note);
        setNotes(prev => prev.map(n => n.id === id ? { ...n, is_deleted: true } : n));
        if (activeNoteId === id) setActiveNoteId(null);
        toast.success('Note moved to local trash');
      }
      return;
    }

    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, is_deleted: true } : n));
        if (activeNoteId === id) setActiveNoteId(null);
        toast.success('Note moved to trash');
      }
    } catch (err) {}
  };

  const moveNoteToProject = async (noteId: number | string, projectId: number | string | null, options?: { silent?: boolean }) => {
    const effectiveProjectId = (projectId === 'none' || projectId === 'uncategorized') ? null : projectId;

    if (isGuest) {
      const note = await localPersistence.getResource(noteId);
      if (note) {
        note.project_id = effectiveProjectId;
        await localPersistence.saveResource(note);
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, project_id: effectiveProjectId } : n));
        if (!options?.silent) toast.success('Note moved to project locally');
      }
      return true;
    }

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: effectiveProjectId }),
      });
      if (res.ok) {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, project_id: effectiveProjectId } : n));
        if (!options?.silent) toast.success('Note moved to project');
        return true;
      }
    } catch (err) {}
    return false;
  };

  const saveNote = async (note: Note) => {
    if (!note.id) return false;
    
    try {
      const isSyncPending = !isGuest;
      const dataToSave = JSON.stringify({ content: note.content, title: note.title, project_id: note.project_id });
      
      if (isGuest) {
        const localNote = await localPersistence.getResource(note.id);
        if (localNote) {
          localNote.content = note.content;
          localNote.updated_at = new Date().toISOString();
          await localPersistence.saveResource(localNote);
        }
      }

      await localPersistence.saveDraft(DraftType.NOTES, note.id, dataToSave, isSyncPending);
      return true;
    } catch (err) {
      console.error('Error in local saveNote:', err);
      return false;
    }
  };

  const restoreNote = async (id: number | string) => {
    if (isGuest) {
      const note = await localPersistence.getResource(id);
      if (note) {
        note.is_deleted = false;
        note.deleted_at = undefined;
        await localPersistence.saveResource(note);
        setNotes(prev => prev.map(n => String(n.id) === String(id) ? { ...n, is_deleted: false } : n));
        toast.success('Note restored locally');
      }
      return;
    }

    try {
      const res = await fetch(`/api/notes/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        setNotes(prev => prev.map(n => String(n.id) === String(id) ? { ...n, is_deleted: false } : n));
        toast.success('Note restored successfully');
      }
    } catch (err) {}
  };

  const deleteNotePermanent = async (id: number | string) => {
    if (isGuest) {
      await localPersistence.deleteResource(id);
      await localPersistence.clearDraft(DraftType.NOTES, id);
      toast.success('Note permanently deleted from local');
      return;
    }

    try {
      const res = await fetch(`/api/notes/${id}/permanent`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Note permanently deleted');
      }
    } catch (err) {}
  };

  const selectNote = async (id: number | string, options?: { silent?: boolean }) => {
    const note = notes.find(n => n.id === id);
    if (note?.is_deleted) return;
    
    if (!options?.silent) setIsItemLoading(true);
    try {
      // Lazy load full content from server if it's missing (excluded from list query)
      if (!isGuest && note && note.content === undefined) {
        try {
          const res = await fetch(`/api/notes/${id}`);
          if (res.ok) {
            const fullNote = await res.json();
            setNotes(prev => prev.map(n => n.id === id ? { ...n, content: fullNote.content } : n));
          }
        } catch (e) {
          console.error("Failed to lazy load note content:", e);
        }
      }

      const draft = await localPersistence.getDraft(DraftType.NOTES, id);
      if (draft && draft.sync_pending) {
        try {
          const parsed = JSON.parse(draft.data);
          setNotes(prev => prev.map(n => n.id === id ? { ...n, content: parsed.content } : n));
          toast.info("Loaded unsynced local note draft");
        } catch (e) {}
      }
      setActiveNoteId(id);
    } finally {
      setIsItemLoading(false);
    }
  };

  return {
    notes,
    setNotes,
    activeNoteId,
    setActiveNoteId,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    moveNoteToProject,
    saveNote,
    restoreNote,
    deleteNotePermanent,
    hasMoreNotes,
    notesTotal,
    isLoading,
    isItemLoading,
    selectNote,
    duplicateNote
  };
}
