import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  ReactFlowProvider,
  Node,
  Edge
} from '@xyflow/react';
import { copyMarkdownToClipboard } from './lib/markdownUtils';
import '@xyflow/react/dist/style.css';

// Components
import { AppSidebar } from './components/app-sidebar';
import { FeedbackDialog } from "@/components/FeedbackDialog"
import { Login } from './components/Login';
import { MainHeader } from './components/MainHeader';
import { DeleteConfirmModal } from './components/modals/DeleteConfirmModal';
import { ImportNoteModal } from './components/modals/ImportNoteModal';
import { ERDImportModal } from './components/modals/ERDImportModal';
import { ExportNoteModal } from './components/modals/ExportNoteModal';
import { NoteExporter } from './lib/exporters/note-exporter';
import { MoveToTrashAlert } from './components/modals/MoveToTrashAlert';
import { DeleteEntityAlert } from './components/modals/DeleteEntityAlert';
import { RenameDocumentDialog } from './components/modals/RenameDocumentDialog';
import { DuplicateDocumentDialog } from './components/modals/DuplicateDocumentDialog';
import { TablePropertiesModal } from './components/modals/TablePropertiesModal';
import { RelationshipPropertiesModal } from './components/modals/RelationshipPropertiesModal';

// Views
import { ERDView } from './components/views/ERDView';
import { NotesView } from './components/views/NotesView';
import { DrawingsView } from './components/views/DrawingsView';
import { TrashView } from './components/views/TrashView';
import { WelcomeView } from './components/views/WelcomeView';
import { FlowchartView } from './components/views/FlowchartView';
import { ForbiddenView } from "./components/views/ForbiddenView";

// Layout Components
import { OfflineOverlay } from './components/layout/OfflineOverlay';
import { AppInitialization } from './components/layout/AppInitialization';
import { useAppMetadata } from './hooks/useAppMetadata';
import { useFileOperations } from './hooks/useFileOperations';
import { useActiveItemGuard } from './hooks/useActiveItemGuard';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useDiagrams } from './hooks/useDiagrams';
import { useNotes } from './hooks/useNotes';
import { useProjects } from './hooks/useProjects';
import { useDrawings } from './hooks/useDrawings';
import { useFlowcharts } from './hooks/useFlowcharts';
import { useTrash } from './hooks/useTrash';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { useSyncService } from './hooks/useSyncService';
import { usePWAInstall } from './hooks/usePWAInstall';
import { usePublicDocument } from './hooks/usePublicDocument';
import { useERDSession } from './hooks/useERDSession';
import { useSQLGenerator } from './hooks/useSQLGenerator';
import { useUpdateCheck } from './hooks/useUpdateCheck';
import { useImageExporter } from './hooks/useImageExporter';
import { useBroadcastChannel, BroadcastMessageType } from './hooks/useBroadcastChannel';
import { useRealtimeSync } from './hooks/useRealtimeSync';


// Views
import { ChangelogView } from './components/views/ChangelogView';
import { BackupsView } from './components/views/BackupsView';

// Lib & Types
import { localPersistence } from './lib/localPersistence';
import { toast } from 'sonner';
import { Entity, DraftType } from './types';

// UI
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"


// Helper to check for share routes
const getSharePathInfo = () => {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  const match = path.match(/^\/(view|share)\/(diagram|note|drawing|flowchart|erd|notes|drawings)\/([^/]+)/);
  if (match) {
    const typeMap: Record<string, any> = {
      diagram: 'erd',
      erd: 'erd',
      note: 'notes',
      notes: 'notes',
      drawing: 'drawings',
      drawings: 'drawings',
      flowchart: 'flowchart'
    };
    return { type: typeMap[match[2]] || match[2], uid: match[3] };
  }
  return null;
};

function AppContent() {
  const [view, setView] = useState<'erd' | 'notes' | 'drawings' | 'trash' | 'flowchart' | 'changelog' | 'backups'>(() => {
    if (typeof window === 'undefined' || getSharePathInfo()) return 'notes';
    return (localStorage.getItem('erd-builder-last-view') as any) || 'notes';
  });
  const [sidebarView, setSidebarView] = useState<'erd' | 'notes' | 'drawings' | 'flowchart' | 'changelog'>(() => {
    if (typeof window === 'undefined' || getSharePathInfo()) return 'notes';
    return (localStorage.getItem('erd-builder-last-sidebar-view') as any) || 'notes';
  });

  // Persist views
  useEffect(() => {
    if (getSharePathInfo()) return;
    localStorage.setItem('erd-builder-last-view', view);
    localStorage.setItem('erd-builder-last-sidebar-view', sidebarView);
  }, [sidebarView]);

  const [isTablePropertiesOpen, setIsTablePropertiesOpen] = useState(false);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isPermanentDeleteConfirmOpen, setIsPermanentDeleteConfirmOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number | string, type: 'erd' | 'notes' | 'drawings' | 'project' } | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameProjectId, setRenameProjectId] = useState<string>("none");
  const [isMoveToTrashAlertOpen, setIsMoveToTrashAlertOpen] = useState(false);
  const [isImportNoteModalOpen, setIsImportNoteModalOpen] = useState(false);
  const [isExportNoteModalOpen, setIsExportNoteModalOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");
  
  // Safety Gate & Persistence State
  const isLocalSavingRef = useRef(false);
  const setIsLocalSaving = useCallback((val: boolean) => { isLocalSavingRef.current = val; }, []);
  const lastLoadedDiagramIdRef = useRef<number | string | null>(null);
  const lastLoadedNoteIdRef = useRef<number | string | null>(null);
  const lastLoadedDrawingIdRef = useRef<number | string | null>(null);
  const lastLoadedFlowchartIdRef = useRef<number | string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isIncomingSyncRef = useRef(false);
  const lastSaveCallRef = useRef<number>(0);
  const lastDiagramLoadTimestampRef = useRef<number>(0);
  const lastFocusFetchRef = useRef<number>(0);
  
  // 🛡️ Stable State Refs: Used to maintain handler identity without stale closures
  const notesRef = useRef<any[]>([]);
  const drawingsRef = useRef<any[]>([]);
  const flowchartsRef = useRef<any[]>([]);
  const nodesRef = useRef<any[]>([]);
  const edgesRef = useRef<any[]>([]);

  // Auto-save & Sync Timeouts
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notesSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const drawingsSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const flowchartsSaveTimeout = useRef<NodeJS.Timeout | null>(null);






  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  
  // Custom Hooks
  const { isAuthenticated, isGuest, user, checkAuth, handleGuestLogin, handleLogout } = useAuth();
  const isOnline = useConnectionStatus();
  const { triggerDebouncedSync, isSyncing, syncError, syncDrafts, checkAndClearStaleDrafts, hasPendingSyncs } = useSyncService(isAuthenticated, isGuest);
  const { isInstallable, installApp } = usePWAInstall();
  const { handleExportSQL } = useSQLGenerator();
  const { handleExportImage, handleExportPDF } = useImageExporter();

  // Public Document Hook
  const {
    isPublicView, setIsPublicView, publicData, isPublicLoading, forbiddenDoc, fetchPublicDocument
  } = usePublicDocument(setView);

  // ERD Session Hook - moved after diagrams state to get access to activeDiagramId
  const { diagrams, setDiagrams, activeDiagramId, setActiveDiagramId,
    fetchDiagrams, createDiagram, updateDiagram, deleteDiagram, restoreDiagram, deleteDiagramPermanent, moveDiagramToProject, saveDiagram,
    hasMoreDiagrams, isLoading: isDiagramsLoading } = useDiagrams(isAuthenticated, view, isGuest);

  // 🔄 Circular Dependency Resolution: useERDSession needs broadcast functions from useRealtimeSync, 
  // but useRealtimeSync needs setNodes/setEdges from useERDSession.
  // We break this by using a Ref that late-binds the broadcast functions.
  const broadcastRef = useRef<{
    move: (id: string, x: number, y: number) => void;
    update: (id: string, data: Entity) => void;
    edges: (edges: Edge[]) => void;
  }>({
    move: () => {},
    update: () => {},
    edges: () => {},
  });

  const erdOptions = useMemo(() => ({
    broadcastNodeMove: (id: string, x: number, y: number) => broadcastRef.current.move(id, x, y),
    broadcastNodeUpdate: (id: string, data: Entity) => broadcastRef.current.update(id, data),
    broadcastEdgesUpdate: (edges: Edge[]) => broadcastRef.current.edges(edges),
  }), []);

  const { 
    nodes, setNodes, onNodesChange,
    edges, setEdges, onEdgesChange,
    selectedNodeId, setSelectedNodeId,
    selectedEdgeId, setSelectedEdgeId,
    onConnect, addEntity, updateEntity, deleteEntity, handleEdgeUpdate, deleteEdge,
    handleDiagramSelect: selectDiagram, viewportRef,
    undo, redo, canUndo, canRedo, takeSnapshot, isItemLoading: isERDItemLoading, saveCounter
  } = useERDSession(isPublicView, isGuest, isAuthenticated, setView, erdOptions);

  // Effective ID for realtime sync (works for both owner and public guest)
  const effectiveDiagramId = isPublicView ? publicData?.id : activeDiagramId;

  const { broadcastNodeMove, broadcastNodeUpdate, broadcastEdgesUpdate } = useRealtimeSync(
    effectiveDiagramId,
    setNodes,
    setEdges
  );

  // Update the broadcast Ref whenever functions change
  useEffect(() => {
    broadcastRef.current = {
      move: broadcastNodeMove,
      update: broadcastNodeUpdate,
      edges: broadcastEdgesUpdate,
    };
  }, [broadcastNodeMove, broadcastNodeUpdate, broadcastEdgesUpdate]);

  const { 
    notes, setNotes, activeNoteId, setActiveNoteId, fetchNotes, createNote, updateNote, deleteNote, moveNoteToProject, saveNote, restoreNote, deleteNotePermanent,
    hasMoreNotes, isLoading: isNotesLoading, isItemLoading: isNoteItemLoading, selectNote, duplicateNote
  } = useNotes(isGuest);
  
  const { 
    projects, 
    setProjects, 
    uncategorized,
    activeProjectId, 
    setActiveProjectId, 
    fetchProjects, 
    createProject, 
    updateProject, 
    deleteProject,
    restoreProject,
    deleteProjectPermanent,
    hasMoreProjects,
    isLoading: isProjectsLoading
  } = useProjects(isGuest);
  
  const { 
    drawings, setDrawings, activeDrawingId, setActiveDrawingId, fetchDrawings, createDrawing, updateDrawing, deleteDrawing, moveDrawingToProject, saveDrawing, restoreDrawing, deleteDrawingPermanent,
    hasMoreDrawings, isLoading: isDrawingsLoading, isItemLoading: isDrawingItemLoading, selectDrawing, duplicateDrawing
  } = useDrawings(isGuest);

  const {
    flowcharts, setFlowcharts, activeFlowchartId, setActiveFlowchartId, fetchFlowcharts, createFlowchart, updateFlowchart, deleteFlowchart, moveFlowchartToProject, saveFlowchart, restoreFlowchart, deleteFlowchartPermanent,
    hasMoreFlowcharts, isLoading: isFlowchartsLoading, isItemLoading: isFlowchartItemLoading, selectFlowchart
  } = useFlowcharts(isGuest);

  const { trashData, fetchTrash, isLoading: isTrashLoading } = useTrash(isGuest);

  const { broadcastMessage } = useBroadcastChannel(useCallback(async (message) => {
    if (message.type !== BroadcastMessageType.DRAFT_UPDATED) return;
    
    const { type: dataType, id } = message.payload;
    
    if (view === 'erd' && dataType === DraftType.ERD && String(id) === String(activeDiagramId)) {
      console.log("[Broadcast] Incoming sync: updating state from another tab");
      isIncomingSyncRef.current = true;
      // @ts-ignore
      window.currentSyncIsSilent = true;
      await selectDiagram(id, setActiveDiagramId, { silent: true });
      // @ts-ignore
      window.currentSyncIsSilent = false;
      setTimeout(() => { isIncomingSyncRef.current = false; }, 1000);
    } else if (view === 'notes' && dataType === DraftType.NOTES && String(id) === String(activeNoteId)) {
      console.log("[Broadcast] Reloading Note from local draft updated in another tab");
      await selectNote(id, { silent: true });
    } else if (view === 'drawings' && dataType === DraftType.DRAWINGS && String(id) === String(activeDrawingId)) {
      console.log("[Broadcast] Reloading Drawing from local draft updated in another tab");
      await selectDrawing(id, { silent: true });
    } else if (view === 'flowchart' && dataType === DraftType.FLOWCHART && String(id) === String(activeFlowchartId)) {
      console.log("[Broadcast] Reloading Flowchart from local draft updated in another tab");
      await selectFlowchart(id, { silent: true });
    }
  }, [view, activeDiagramId, activeNoteId, activeDrawingId, activeFlowchartId, selectDiagram, selectNote, selectDrawing, selectFlowchart, setActiveDiagramId]));

  // Sync refs with latest state
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);
  useEffect(() => { flowchartsRef.current = flowcharts; }, [flowcharts]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);


  // Handlers
  // Computed Values
  const {
    currentActiveId,
    activeDocument,
    initialShareSettings,
    activeNote,
    activeDrawing,
    activeFlowchart,
    activeDiagram,
    featureLabel,
    activeFileName,
    activeProjectName,
    activeFileUid,
    hasActiveItem,
  } = useAppMetadata({
    view,
    isPublicView,
    publicData,
    activeDiagramId,
    activeNoteId,
    activeDrawingId,
    activeFlowchartId,
    diagrams,
    notes,
    drawings,
    flowcharts,
  });


  // Sync initialization: Ensure guards allow saving once data is loaded
  useEffect(() => {
    if (activeDiagramId && !isERDItemLoading) {
      lastLoadedDiagramIdRef.current = activeDiagramId;
      lastDiagramLoadTimestampRef.current = Date.now();
    }
  }, [activeDiagramId, isERDItemLoading]);

  useEffect(() => {
    if (activeNoteId && !isNoteItemLoading) lastLoadedNoteIdRef.current = activeNoteId;
  }, [activeNoteId, isNoteItemLoading]);

  useEffect(() => {
    if (activeDrawingId && !isDrawingItemLoading) lastLoadedDrawingIdRef.current = activeDrawingId;
  }, [activeDrawingId, isDrawingItemLoading]);

  useEffect(() => {
    if (activeFlowchartId && !isFlowchartItemLoading) lastLoadedFlowchartIdRef.current = activeFlowchartId;
  }, [activeFlowchartId, isFlowchartItemLoading]);

  const selectedEntity = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = nodes.find((n) => n.id === selectedNodeId);
    return node ? (node.data as Entity) : null;
  }, [nodes, selectedNodeId]);

  useActiveItemGuard({
    view,
    activeDiagramId,
    activeNoteId,
    activeDrawingId,
    activeFlowchartId,
    diagrams,
    notes,
    drawings,
    flowcharts,
    projects,
    isPublicView,
    setActiveDiagramId,
    setActiveNoteId,
    setActiveDrawingId,
    setActiveFlowchartId,
    setActiveProjectId,
  });

  const handleEntityUpdate = useCallback(async (updatedEntity: Entity, options?: { immediate?: boolean }) => {
    updateEntity(updatedEntity);
    
    if (options?.immediate) {
      // Clear any pending debounced auto-saves to prevent double sync
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        setIsLocalSaving(false);
      }

      // 1. Instant Local Save (IndexedDB)
      // We manually construct the nodes array because state updates are async
      const currentNodes = nodesRef.current.map(node => 
        node.id === updatedEntity.id ? { ...node, data: updatedEntity } : node
      );
      await saveDiagram(currentNodes, edgesRef.current, viewportRef.current);
      lastSaveCallRef.current = Date.now();
      
      // 2. Instant Cloud Sync (Supabase)
      syncDrafts();

      // 3. Broadcast update to other clients
      broadcastNodeUpdate(updatedEntity.id, updatedEntity);
    }
  }, [updateEntity, saveDiagram, viewportRef, syncDrafts, broadcastNodeUpdate]);

  const handleEditEntity = useCallback((e: any) => {
    setSelectedNodeId(e.detail);
    setIsTablePropertiesOpen(true);
  }, [setSelectedNodeId]);
  const handleDeleteEntity = useCallback((e: any) => deleteEntity(e.detail), [deleteEntity]);

  const handleNoteChange = useCallback((content: string) => {
    if (!activeNoteId) return;
    
    // Prevent loop: If this change came from another tab's sync, DON'T save it back
    if (isIncomingSyncRef.current) return;

    const noteId = activeNoteId;
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content } : n));
    
    setIsLocalSaving(true);
    if (notesSaveTimeout.current) clearTimeout(notesSaveTimeout.current);
    
    // SAFETY: Note ID Validation Guard
    if (lastLoadedNoteIdRef.current !== activeNoteId) return;

    notesSaveTimeout.current = setTimeout(async () => {
      // SAFETY: Wait if still loading/refreshing
      if (isRefreshing || isNoteItemLoading) return;
      
      const n = notesRef.current.find(n => String(n.id) === String(noteId));
      if (n) {
        // CRITICAL: We must use the 'content' argument from the outer scope 
        // which contains the LATEST change, rather than 'n.content' from 
        // the potentially stale 'notes' state array.
        await saveNote({ ...n, content });
      }
      
      lastSaveCallRef.current = Date.now();
      setIsLocalSaving(false);
      triggerDebouncedSync();
      broadcastMessage(BroadcastMessageType.DRAFT_UPDATED, DraftType.NOTES, noteId);
    }, 800);
  }, [activeNoteId, saveNote, setNotes, triggerDebouncedSync, isRefreshing, isNoteItemLoading, broadcastMessage]);

  const handleDrawingChange = useCallback((data: string) => {
    if (!activeDrawingId) return;
    
    // Prevent loop: If this change came from another tab's sync, DON'T save it back
    if (isIncomingSyncRef.current) return;

    const drawingId = activeDrawingId;
    setDrawings(prev => prev.map(d => String(d.id) === String(drawingId) ? { ...d, data } : d));
    
    setIsLocalSaving(true);
    if (drawingsSaveTimeout.current) clearTimeout(drawingsSaveTimeout.current);
    
    // SAFETY: Drawing ID Validation Guard
    if (lastLoadedDrawingIdRef.current !== activeDrawingId) return;

    drawingsSaveTimeout.current = setTimeout(async () => {
      // SAFETY: Wait if still loading/refreshing
      if (isRefreshing || isDrawingItemLoading) return;
      
      const currentDrawing = drawingsRef.current.find(d => String(d.id) === String(drawingId));
      if (!currentDrawing) return;
      
      await saveDrawing({
        ...currentDrawing,
        data
      } as any);
      
      lastSaveCallRef.current = Date.now();
      setIsLocalSaving(false);
      triggerDebouncedSync();
      broadcastMessage(BroadcastMessageType.DRAFT_UPDATED, DraftType.DRAWINGS, drawingId);
    }, 1500);
  }, [activeDrawingId, saveDrawing, setDrawings, triggerDebouncedSync, isRefreshing, isDrawingItemLoading, broadcastMessage]);

  const handleFlowchartChange = useCallback((nodesData: any[], edgesData: any[]) => {
    if (!activeFlowchartId) return;

    // Prevent loop: If this change came from another tab's sync, DON'T save it back
    if (isIncomingSyncRef.current) return;

    const flowchartId = activeFlowchartId;
    const dataString = JSON.stringify({ nodes: nodesData, edges: edgesData });
    setFlowcharts(prev => prev.map(f => String(f.id) === String(flowchartId) ? { ...f, data: dataString } : f));
    
    setIsLocalSaving(true);
    if (flowchartsSaveTimeout.current) clearTimeout(flowchartsSaveTimeout.current);
    
    // SAFETY: Flowchart ID Validation Guard
    if (lastLoadedFlowchartIdRef.current !== activeFlowchartId) return;

    flowchartsSaveTimeout.current = setTimeout(async () => {
      // SAFETY: Wait if still loading/refreshing
      if (isRefreshing || isFlowchartItemLoading) return;
      
      const currentFlowchart = flowchartsRef.current.find(f => String(f.id) === String(flowchartId));
      if (!currentFlowchart) return;
      
      await saveFlowchart({
        ...currentFlowchart,
        data: dataString
      } as any);
      
      lastSaveCallRef.current = Date.now();
      setIsLocalSaving(false);
      triggerDebouncedSync();
      broadcastMessage(BroadcastMessageType.DRAFT_UPDATED, DraftType.FLOWCHART, flowchartId);
    }, 1500);
  }, [activeFlowchartId, saveFlowchart, setFlowcharts, triggerDebouncedSync, isRefreshing, isFlowchartItemLoading, broadcastMessage]);

  async function flushPendingSaves() {
    if (!isLocalSavingRef.current) return;

    // 1. Force clear any pending timeouts
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (notesSaveTimeout.current) clearTimeout(notesSaveTimeout.current);
    if (drawingsSaveTimeout.current) clearTimeout(drawingsSaveTimeout.current);
    if (flowchartsSaveTimeout.current) clearTimeout(flowchartsSaveTimeout.current);

    // 2. Perform immediate local save for current active document
    try {
      if (view === 'erd' && activeDiagramId) {
        await saveDiagram(nodes, edges, viewportRef.current);
      } else if (view === 'notes' && activeNoteId) {
        const n = notes.find(n => String(n.id) === String(activeNoteId));
        if (n) await saveNote(n);
      } else if (view === 'drawings' && activeDrawingId) {
        const d = drawings.find(d => String(d.id) === String(activeDrawingId));
        if (d) await saveDrawing(d);
      } else if (view === 'flowchart' && activeFlowchartId) {
        const f = flowcharts.find(f => String(f.id) === String(activeFlowchartId));
        if (f) await saveFlowchart(f);
      }
      
      lastSaveCallRef.current = Date.now();
      setIsLocalSaving(false);
      
      // 3. Trigger cloud sync immediately (skip debounce)
      await syncDrafts();
    } catch (err) {
      console.warn("Failed to flush pending saves during switch:", err);
    }
  }

  async function handleDiagramSelect(id: number | string) {
    if (activeDiagramId === id && view === 'erd') return;
    await flushPendingSaves();
    setView('erd');
    // Clear current diagram entities to avoid showing stale data while loading
    setNodes([]);
    setEdges([]);
    await selectDiagram(id, (newId) => {
      setActiveDiagramId(newId);
      lastLoadedDiagramIdRef.current = newId;
    });
  }

  async function handleNoteSelect(id: number | string) {
    if (activeNoteId === id && view === 'notes') return; 
    await flushPendingSaves();
    setView('notes');
    // Clear current note content to avoid showing stale data while loading
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content: undefined } : n));
    await selectNote(id);
    lastLoadedNoteIdRef.current = id;
  }

  async function handleDrawingSelect(id: number | string) {
    if (activeDrawingId === id && view === 'drawings') return; 
    await flushPendingSaves();
    setView('drawings');
    // Clear current drawing data to avoid showing stale data while loading
    setDrawings(prev => prev.map(d => d.id === id ? { ...d, data: undefined } : d));
    await selectDrawing(id);
    lastLoadedDrawingIdRef.current = id;
  }

  async function handleFlowchartSelect(id: number | string) {
    if (activeFlowchartId === id && view === 'flowchart') return; 
    await flushPendingSaves();
    setView('flowchart');
    // Clear current flowchart data to avoid showing stale data while loading
    setFlowcharts(prev => prev.map(f => f.id === id ? { ...f, data: undefined } : f));
    await selectFlowchart(id);
    lastLoadedFlowchartIdRef.current = id;
  }

  async function handleProjectSelect(id: number | string | null) {
    await flushPendingSaves();
    setActiveProjectId(id);
  }

  const {
    handleExportMarkdown,
    handleImportMarkdown,
    handleCopyMarkdown,
    executeExportMarkdown,
    executeImportMarkdown,
  } = useFileOperations({
    activeNote,
    activeNoteId,
    activeProjectId,
    createNote,
    saveNote,
    setActiveNoteId,
    handleNoteChange,
    setIsExportNoteModalOpen,
    setIsImportNoteModalOpen,
  });

  // 🛡️ Sidebar Handlers (Memoized to maintain AppSidebar stability)
  const handleSidebarDiagramCreate = useCallback(async (n: string, pid?: number | string | null) => {
    const d = await createDiagram(n, pid);
    if (d) {
      await fetchProjects();
      handleDiagramSelect(d.id);
    }
  }, [createDiagram, fetchProjects, handleDiagramSelect]);

  const handleSidebarNoteCreate = useCallback(async (t: string, pid?: number | string | null) => {
    const n = await createNote(t, pid);
    if (n) {
      await fetchProjects();
      handleNoteSelect(n.id);
    }
  }, [createNote, fetchProjects, handleNoteSelect]);

  const handleSidebarDrawingCreate = useCallback(async (t: string, pid?: number | string | null) => {
    const d = await createDrawing(t, pid);
    if (d) {
      await fetchProjects();
      handleDrawingSelect(d.id);
    }
  }, [createDrawing, fetchProjects, handleDrawingSelect]);

  const handleSidebarFlowchartCreate = useCallback(async (t: string, pid?: number | string | null) => {
    const f = await createFlowchart(t, pid);
    if (f) {
      await fetchProjects();
      handleFlowchartSelect(f.id);
    }
  }, [createFlowchart, fetchProjects, handleFlowchartSelect]);

  const handleSidebarProjectCreate = useCallback(async (n: string) => {
    await createProject(n);
    await fetchProjects();
  }, [createProject, fetchProjects]);

  const handleSidebarProjectUpdate = useCallback(async (id: number | string, n: string) => {
    await updateProject(id, n);
    await fetchProjects();
  }, [updateProject, fetchProjects]);

  const handleSidebarProjectDelete = useCallback(async (id: number | string) => {
    await deleteProject(id);
    await fetchTrash();
    await fetchProjects();
  }, [deleteProject, fetchTrash, fetchProjects]);

  const handleSidebarDiagramUpdate = useCallback(async (id: number | string, n: string, opts?: any) => {
    await updateDiagram(id, n, opts);
    await fetchProjects();
  }, [updateDiagram, fetchProjects]);

  const handleSidebarNoteUpdate = useCallback(async (id: number | string, t: string, opts?: any) => {
    await updateNote(id, t, opts);
    await fetchProjects();
  }, [updateNote, fetchProjects]);

  const handleSidebarDrawingUpdate = useCallback(async (id: number | string, t: string, opts?: any) => {
    await updateDrawing(id, t, opts);
    await fetchProjects();
  }, [updateDrawing, fetchProjects]);

  const handleSidebarFlowchartUpdate = useCallback(async (id: number | string, t: string, opts?: any) => {
    await updateFlowchart(id, t, opts);
    await fetchProjects();
  }, [updateFlowchart, fetchProjects]);

  const handleSidebarDiagramDelete = useCallback(async (id: number | string) => {
    await deleteDiagram(id);
    await fetchTrash();
    await fetchProjects();
  }, [deleteDiagram, fetchTrash, fetchProjects]);

  const handleSidebarNoteDelete = useCallback(async (id: number | string) => {
    await deleteNote(id);
    await fetchTrash();
    await fetchProjects();
  }, [deleteNote, fetchTrash, fetchProjects]);

  const handleSidebarDrawingDelete = useCallback(async (id: number | string) => {
    await deleteDrawing(id);
    await fetchTrash();
    await fetchProjects();
  }, [deleteDrawing, fetchTrash, fetchProjects]);

  const handleSidebarFlowchartDelete = useCallback(async (id: number | string) => {
    await deleteFlowchart(id);
    await fetchTrash();
    await fetchProjects();
  }, [deleteFlowchart, fetchTrash, fetchProjects]);

  const handleSidebarMoveDiagramToProject = useCallback(async (id: number | string, pid: number | string | null, opts?: any) => {
    await moveDiagramToProject(id, pid, opts);
    await fetchProjects();
  }, [moveDiagramToProject, fetchProjects]);

  const handleSidebarMoveNoteToProject = useCallback(async (id: number | string, pid: number | string | null, opts?: any) => {
    await moveNoteToProject(id, pid, opts);
    await fetchProjects();
  }, [moveNoteToProject, fetchProjects]);

  const handleSidebarMoveDrawingToProject = useCallback(async (id: number | string, pid: number | string | null, opts?: any) => {
    await moveDrawingToProject(id, pid, opts);
    await fetchProjects();
  }, [moveDrawingToProject, fetchProjects]);

  const handleSidebarMoveFlowchartToProject = useCallback(async (id: number | string, pid: number | string | null, opts?: any) => {
    await moveFlowchartToProject(id, pid, opts);
    await fetchProjects();
  }, [moveFlowchartToProject, fetchProjects]);

  const handleSidebarLoadMoreProjects = useCallback(() => fetchProjects(true, searchQuery), [fetchProjects, searchQuery]);
  const handleSidebarLoadMoreDiagrams = useCallback(() => fetchDiagrams(true, activeProjectId === null ? 'all' : activeProjectId, searchQuery), [fetchDiagrams, activeProjectId, searchQuery]);
  const handleSidebarLoadMoreNotes = useCallback(() => fetchNotes(true, activeProjectId === null ? 'all' : activeProjectId, searchQuery), [fetchNotes, activeProjectId, searchQuery]);
  const handleSidebarLoadMoreDrawings = useCallback(() => fetchDrawings(true, activeProjectId === null ? 'all' : activeProjectId, searchQuery), [fetchDrawings, activeProjectId, searchQuery]);
  const handleSidebarLoadMoreFlowcharts = useCallback(() => fetchFlowcharts(true, activeProjectId === null ? 'all' : activeProjectId, searchQuery), [fetchFlowcharts, activeProjectId, searchQuery]);

  const handleSidebarNoteCopyMarkdown = useCallback(async (id: number | string) => {
    const note = notesRef.current.find(n => String(n.id) === String(id));
    if (note) await copyMarkdownToClipboard(note.content || '');
  }, []);

  const handleSidebarNoteImportMarkdown = useCallback((id: number | string) => {
    handleNoteSelect(id);
    setTimeout(() => setIsImportNoteModalOpen(true), 100);
  }, [handleNoteSelect]);

  const handleSidebarNoteExportMarkdown = useCallback((id: number | string) => {
    handleNoteSelect(id);
    setTimeout(() => setIsExportNoteModalOpen(true), 100);
  }, [handleNoteSelect]);


  // 🛡️ Header Handlers (Memoized to prevent flicker)
  const handleHeaderSettingsSaved = useCallback(() => {
    const pid = 'all';
    if (view === 'erd') fetchDiagrams(false, pid, debouncedSearchQuery, null, 50);
    else if (view === 'notes') fetchNotes(false, pid, debouncedSearchQuery, null, 50);
    else if (view === 'drawings') fetchDrawings(false, pid, debouncedSearchQuery, null, 50);
    else if (view === 'flowchart') fetchFlowcharts(false, pid, debouncedSearchQuery, null, 50);
  }, [view, debouncedSearchQuery, fetchDiagrams, fetchNotes, fetchDrawings, fetchFlowcharts]);

  const handleHeaderDelete = useCallback(() => {
    if (!currentActiveId) return;
    setIsMoveToTrashAlertOpen(true);
  }, [currentActiveId]);

  const handleHeaderRename = useCallback(() => {
    if (!activeDocument) return;
    setNewName(activeDocument.title || activeDocument.name || "");
    setRenameProjectId(activeDocument.project_id?.toString() || activeDocument.projectId?.toString() || "none");
    setIsRenameDialogOpen(true);
  }, [activeDocument]);

  const handleHeaderExportSQL = useCallback((dialect: 'postgresql' | 'mysql') => {
    if (activeDocument) {
      handleExportSQL(dialect, { name: activeFileName || 'Untitled' }, nodesRef.current, edgesRef.current);
    }
  }, [activeDocument, activeFileName, handleExportSQL]);

  const handleHeaderExportPDF = useCallback(() => {
    if (activeDocument) {
      handleExportPDF(activeFileName || 'Untitled');
    }
  }, [activeDocument, activeFileName, handleExportPDF]);

  const handleHeaderExportImage = useCallback(() => {
    if (activeDocument) {
      handleExportImage(activeFileName || 'Untitled');
    }
  }, [activeDocument, activeFileName, handleExportImage]);


  useUpdateCheck(() => handleViewChange('changelog'));


  useEffect(() => {
    const shareInfo = getSharePathInfo();
    if (shareInfo) {
      setIsPublicView(true);
      const savedToken = sessionStorage.getItem(`share_token_${shareInfo.uid}`);
      fetchPublicDocument(shareInfo.type, shareInfo.uid, setNodes, setEdges, savedToken || undefined);
    }

    if (isInstallable) {
      const hasSeenToast = sessionStorage.getItem('pwa-install-toast-shown');
      if (!hasSeenToast) {
        toast("✨ Enhance your experience", {
          description: "Install ERD Builder Pro as a desktop app for offline access and better performance.",
          action: { label: "Install", onClick: () => installApp() },
          duration: 10000,
        });
        sessionStorage.setItem('pwa-install-toast-shown', 'true');
      }
    }
  }, [isInstallable, installApp]);

  useEffect(() => {
    if (!isOnline && !isPublicView) {
      if (view === 'erd' && activeDiagramId) saveDiagram(nodes, edges, viewportRef.current);
      else if (view === 'notes' && activeNoteId) { const n = notes.find(n => String(n.id) === String(activeNoteId)); if (n) saveNote(n); }
      else if (view === 'drawings' && activeDrawingId) { const d = drawings.find(d => String(d.id) === String(activeDrawingId)); if (d) saveDrawing(d); }
      else if (view === 'flowchart' && activeFlowchartId) { const f = flowcharts.find(f => String(f.id) === String(activeFlowchartId)); if (f) saveFlowchart(f); }
    }
  }, [isOnline, view, activeDiagramId, activeNoteId, activeDrawingId, activeFlowchartId, nodes, edges]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    
    if (isAuthenticated && !isPublicView) {
      // One master fetch to rule them all (Sidebar Tree + Initial File Lists)
      fetchProjects(false, debouncedSearchQuery).then(json => {
        if (json && json.data) {
          // Aggregate all files from all projects + uncategorized to populate main states
          const allDiagrams = [
            ...json.data.flatMap((p: any) => p.diagrams || []),
            ...(json.uncategorized?.diagrams || [])
          ];
          const allNotes = [
            ...json.data.flatMap((p: any) => p.notes || []),
            ...(json.uncategorized?.notes || [])
          ];
          const allDrawings = [
            ...json.data.flatMap((p: any) => p.drawings || []),
            ...(json.uncategorized?.drawings || [])
          ];
          const allFlowcharts = [
            ...json.data.flatMap((p: any) => p.flowcharts || []),
            ...(json.uncategorized?.flowcharts || [])
          ];

          // Update main states to keep them in sync with the tree
          // IMPORTANT: Merge with existing data to preserve 'content', 'entities', etc. for active items
          setDiagrams(prev => {
            const currentMap = new Map(prev.map(d => [String(d.id), d]));
            return allDiagrams.map(newD => {
              const existing = currentMap.get(String(newD.id));
              if (existing) {
                return { ...newD, entities: existing.entities, relationships: existing.relationships };
              }
              return newD;
            });
          });

          setNotes(prev => {
            const currentMap = new Map(prev.map(n => [String(n.id), n]));
            return allNotes.map(newN => {
              const existing = currentMap.get(String(newN.id));
              if (existing) {
                return { ...newN, content: existing.content };
              }
              return newN;
            });
          });

          setDrawings(prev => {
            const currentMap = new Map(prev.map(d => [String(d.id), d]));
            return allDrawings.map(newD => {
              const existing = currentMap.get(String(newD.id));
              if (existing) {
                return { ...newD, data: existing.data };
              }
              return newD;
            });
          });

          setFlowcharts(prev => {
            const currentMap = new Map(prev.map(f => [String(f.id), f]));
            return allFlowcharts.map(newF => {
              const existing = currentMap.get(String(newF.id));
              if (existing) {
                return { ...newF, data: existing.data };
              }
              return newF;
            });
          });
        }
      });
      
      // Still need trash as it's a different view
      if (view === 'trash') fetchTrash();
    }
  }, [isAuthenticated, fetchProjects, debouncedSearchQuery, isPublicView, view, fetchTrash, setDiagrams, setNotes, setDrawings, setFlowcharts]);

  // Cross-Tab Synchronization via Broadcast Channel

  // Conflict Resolution: Clear stale local drafts when cloud data is loaded
  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      if (diagrams.length > 0) checkAndClearStaleDrafts(DraftType.ERD, diagrams);
      if (notes.length > 0) checkAndClearStaleDrafts(DraftType.NOTES, notes);
      if (drawings.length > 0) checkAndClearStaleDrafts(DraftType.DRAWINGS, drawings);
      if (flowcharts.length > 0) checkAndClearStaleDrafts(DraftType.FLOWCHART, flowcharts);
    }
  }, [diagrams, notes, drawings, flowcharts, isAuthenticated, isGuest, checkAndClearStaleDrafts]);

  // Safety Gate: Intercept tab close/reload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isLocalSavingRef.current) {
        e.preventDefault();
        e.returnValue = ''; // Required by modern browsers to trigger the dialog
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Intelligent Fetch on Focus: Refresh data when returning to tab
  useEffect(() => {
    const handleFocus = async () => {
      // Only refresh if online, authenticated, not in public view, and not currently saving/syncing
      if (!isOnline || !isAuthenticated || isPublicView || isLocalSavingRef.current || isRefreshing || isSyncing) return;
      
      // Throttle: don't refresh more than once every 120 seconds (2 minutes)
      const now = Date.now();
      if (now - lastFocusFetchRef.current < 120000) return;
      
      // SAFETY: Don't refresh if we have a very recent local save (within 10 seconds)
      if (now - lastSaveCallRef.current < 10000) return;

      lastFocusFetchRef.current = now;

      try {
        const pid = 'all'; // Always fetch all to keep sidebar and current document stable
        
        // Refresh the list and the active item SILENTLY (no skeletons)
        if (view === 'erd') {
          await fetchDiagrams(false, pid, debouncedSearchQuery, null, 50, { silent: true });
          if (activeDiagramId) {
            const draft = await localPersistence.getDraft(DraftType.ERD, activeDiagramId);
            const cloudItem = diagrams.find(d => String(d.id) === String(activeDiagramId));
            const isStale = cloudItem && draft && !draft.sync_pending && (new Date(cloudItem.updated_at).getTime() > draft.updated_at);
            
            if (isStale) {
              console.log("[FocusSync] Cloud is newer, reloading ERD...");
              setIsRefreshing(true); // Only show loader when we ARE certain we need to reload
              await localPersistence.deleteDraft(DraftType.ERD, activeDiagramId);
              await selectDiagram(activeDiagramId, setActiveDiagramId, { silent: true });
              setIsRefreshing(false);
            }
          }
        } else if (view === 'notes') {
          await fetchNotes(false, pid, debouncedSearchQuery, null, 50, { silent: true });
          if (activeNoteId) {
            const draft = await localPersistence.getDraft(DraftType.NOTES, activeNoteId);
            const cloudItem = notes.find(n => String(n.id) === String(activeNoteId));
            const isStale = cloudItem && draft && !draft.sync_pending && (new Date(cloudItem.updated_at).getTime() > draft.updated_at);
            
            if (isStale) {
              console.log("[FocusSync] Cloud is newer, reloading Note...");
              setIsRefreshing(true);
              await localPersistence.deleteDraft(DraftType.NOTES, activeNoteId);
              await selectNote(activeNoteId, { silent: true });
              setIsRefreshing(false);
            }
          }
        } else if (view === 'drawings') {
          await fetchDrawings(false, pid, debouncedSearchQuery, null, 50, { silent: true });
          if (activeDrawingId) {
            const draft = await localPersistence.getDraft(DraftType.DRAWINGS, activeDrawingId);
            const cloudItem = drawings.find(d => String(d.id) === String(activeDrawingId));
            const isStale = cloudItem && draft && !draft.sync_pending && (new Date(cloudItem.updated_at).getTime() > draft.updated_at);
            
            if (isStale) {
              await localPersistence.deleteDraft(DraftType.DRAWINGS, activeDrawingId);
              await selectDrawing(activeDrawingId, { silent: true });
            } else if (!(await localPersistence.hasPendingSync(DraftType.DRAWINGS, activeDrawingId))) {
              await selectDrawing(activeDrawingId, { silent: true });
            }
          }
        } else if (view === 'flowchart') {
          await fetchFlowcharts(false, pid, debouncedSearchQuery, null, 50, { silent: true });
          if (activeFlowchartId) {
            const draft = await localPersistence.getDraft(DraftType.FLOWCHART, activeFlowchartId);
            const cloudItem = flowcharts.find(f => String(f.id) === String(activeFlowchartId));
            const isStale = cloudItem && draft && !draft.sync_pending && (new Date(cloudItem.updated_at).getTime() > draft.updated_at);
            
            if (isStale) {
              await localPersistence.deleteDraft(DraftType.FLOWCHART, activeFlowchartId);
              await selectFlowchart(activeFlowchartId, { silent: true });
            } else if (!(await localPersistence.hasPendingSync(DraftType.FLOWCHART, activeFlowchartId))) {
              await selectFlowchart(activeFlowchartId, { silent: true });
            }
          }
        }
      } catch (err) {
        console.warn("Background refresh on focus failed:", err);
      } finally {
        setIsRefreshing(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [
    isOnline, isAuthenticated, isPublicView, isRefreshing, isSyncing,
    view, debouncedSearchQuery,
    activeDiagramId, activeNoteId, activeDrawingId, activeFlowchartId,
    fetchDiagrams, fetchNotes, fetchDrawings, fetchFlowcharts,
    selectDiagram, selectNote, selectDrawing, selectFlowchart,
    setActiveDiagramId
  ]);

  // Emergency Flush: Save immediately when switching tabs or minimizing
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isLocalSavingRef.current) {
        // Trigger all active saves immediately
        if (view === 'erd' && activeDiagramId) {
          saveDiagram(nodes, edges, viewportRef.current).then(() => {
            setIsLocalSaving(false);
            triggerDebouncedSync();
          });
        } else if (view === 'notes' && activeNoteId) {
          const n = notes.find(n => String(n.id) === String(activeNoteId));
          if (n) {
            saveNote(n).then(() => {
              setIsLocalSaving(false);
              triggerDebouncedSync();
            });
          }
        } else if (view === 'drawings' && activeDrawingId) {
          const d = drawings.find(d => String(d.id) === String(activeDrawingId));
          if (d) {
            saveDrawing(d).then(() => {
              setIsLocalSaving(false);
              triggerDebouncedSync();
            });
          }
        } else if (view === 'flowchart' && activeFlowchartId) {
          const f = flowcharts.find(f => String(f.id) === String(activeFlowchartId));
          if (f) {
            saveFlowchart(f).then(() => {
              setIsLocalSaving(false);
              triggerDebouncedSync();
            });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [view, activeDiagramId, activeNoteId, activeDrawingId, activeFlowchartId, nodes, edges, saveDiagram, saveNote, saveDrawing, saveFlowchart, triggerDebouncedSync, notes, drawings, flowcharts]);

  // 🛡️ Track last processed saveCounter to skip effect on diagram navigation (no actual edits)
  const lastProcessedCounterRef = useRef(0);

  // ERD Auto-save
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    // 🛡️ Skip if saveCounter hasn't actually incremented (e.g., only activeDiagramId changed
    // due to diagram navigation). This prevents unnecessary save trigger + flicker on initial load.
    if (saveCounter === lastProcessedCounterRef.current) return;
    lastProcessedCounterRef.current = saveCounter;

    if (activeDiagramId && (isAuthenticated || isGuest) && view === 'erd' && !isPublicView) {
      // Prevent loop: If this change came from another tab's sync, DON'T save it back
      if (isIncomingSyncRef.current) {
        console.log("[SaveGuard] Skipping save: Change was from an incoming sync");
        return;
      }

      setIsLocalSaving(true);
      
      saveTimeoutRef.current = setTimeout(async () => {
        // SAFETY 0: Skip if an immediate save was just performed
        if (Date.now() - lastSaveCallRef.current < 500) {
          console.log("[SaveGuard] Skipping auto-save: immediate save was just performed");
          setIsLocalSaving(false);
          return;
        }

        // SAFETY 0b: Skip if diagram was just loaded (no changes made yet)
        if (Date.now() - lastDiagramLoadTimestampRef.current < 2000) {
          console.log("[SaveGuard] Skipping auto-save: diagram was just loaded");
          setIsLocalSaving(false);
          return;
        }

        // SAFETY 1: ID Validation Guard — diagram was switched, nothing to save
        if (lastLoadedDiagramIdRef.current !== activeDiagramId) {
          setIsLocalSaving(false);
          return;
        }

        // SAFETY 2: Loading/Refresh Guard - Wait if still loading
        if (isRefreshing || isERDItemLoading || isDiagramsLoading) {
          console.log("[SaveGuard] Deferring save: App is refreshing/loading");
          setIsLocalSaving(false);
          return; 
        }

        // SAFETY 3: Hard Guard for empty states
        // Never save a completely empty ERD automatically unless we are absolutely sure 
        // it's not a loading/race condition error.
        if (nodes.length === 0) {
           console.warn("[SaveGuard] Blocking auto-save of empty ERD to prevent data loss");
           setIsLocalSaving(false);
           return;
        }
        await saveDiagram(nodes, edges, viewportRef.current);
        lastSaveCallRef.current = Date.now();
        setIsLocalSaving(false);
        triggerDebouncedSync();
        broadcastMessage(BroadcastMessageType.DRAFT_UPDATED, DraftType.ERD, activeDiagramId);
      }, 800);
    }
    return () => { 
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      setIsLocalSaving(false); 
    };
  }, [saveCounter, activeDiagramId, isAuthenticated, isGuest, view, saveDiagram, isPublicView, triggerDebouncedSync, broadcastMessage]);

  // Handlers




  useEffect(() => {
    window.addEventListener('editEntity', handleEditEntity);
    window.addEventListener('deleteEntity', handleDeleteEntity);
    return () => {
      window.removeEventListener('editEntity', handleEditEntity);
      window.removeEventListener('deleteEntity', handleDeleteEntity);
    };
  }, [handleEditEntity, handleDeleteEntity]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (hasPendingSyncs && !isSyncing && isOnline) {
          syncDrafts();
        }
      }

      if (view === 'erd') {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          if (e.shiftKey) {
            if (canRedo) redo();
          } else {
            if (canUndo) undo();
          }
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
          if (canRedo) redo();
        }
      } else if (view === 'notes') {
        // Notes specific shortcuts - only active when a note is open
        if (!activeNoteId) return;

        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
          e.preventDefault();
          setIsExportNoteModalOpen(true);
        } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
          e.preventDefault();
          setIsImportNoteModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [view, activeNoteId, undo, redo, canUndo, canRedo, setIsExportNoteModalOpen, setIsImportNoteModalOpen]);

  


  const handleViewChange = async (newView: typeof view) => {
    if (!isOnline && !isPublicView) {
      toast.error("Offline Mode: Navigation is disabled.", { duration: 5000 });
      return;
    }
    
    // Flush any pending changes before switching views
    if (newView !== view) {
      await flushPendingSaves();
    }

    setView(newView);
    if (newView !== 'trash' && newView !== 'changelog' && newView !== 'backups') {
      setSidebarView(newView);
    }
  };


  const confirmPermanentDelete = async () => {
    if (itemToDelete) {
      const { id, type } = itemToDelete;
      if (type === 'project') await deleteProjectPermanent(id);
      else if (type === 'erd') await deleteDiagramPermanent(id);
      else if (type === 'notes') await deleteNotePermanent(id);
      else if (type === 'drawings') await deleteDrawingPermanent(id);
      else if (type === 'flowchart') await deleteFlowchartPermanent(id);
      setIsPermanentDeleteConfirmOpen(false);
      setItemToDelete(null);
      await fetchTrash();
    }
  };





  const handleDuplicate = () => {
    if (!activeDocument) return;
    setDuplicateName(`${activeDocument.title || activeDocument.name} (Copy)`);
    setIsDuplicateDialogOpen(true);
  };

  const executeDuplicate = async () => {
    if (!activeDocument || !duplicateName.trim()) return;
    
    setIsRefreshing(true);
    try {
      if (view === 'notes') {
        const newNote = await duplicateNote(activeDocument.id, duplicateName);
        if (newNote) {
          await handleNoteSelect(newNote.id);
          toast.success("Note duplicated successfully");
        }
      } else if (view === 'drawings') {
        const newDrawing = await duplicateDrawing(activeDocument.id, duplicateName);
        if (newDrawing) {
          await handleDrawingSelect(newDrawing.id);
          toast.success("Drawing duplicated successfully");
        }
      } else {
        toast.info("Duplication for this document type is disabled.");
      }
    } catch (err) {
      console.error("Duplicate error:", err);
      toast.error("Failed to duplicate document.");
    } finally {
      setIsRefreshing(false);
      setIsDuplicateDialogOpen(false);
    }
  };



  if (isAuthenticated === null && !isPublicView) return <AppInitialization type="init" />;
  if (isPublicLoading) return <AppInitialization type="public" view={view} />;

  if (forbiddenDoc) {
    const shareInfo = getSharePathInfo();
    return (
      <ForbiddenView 
        title={forbiddenDoc.title} message={forbiddenDoc.message} statusCode={forbiddenDoc.status} documentUid={shareInfo?.uid}
        onSubmitToken={async t => { if (shareInfo) { const s = await fetchPublicDocument(shareInfo.type, shareInfo.uid, setNodes, setEdges, t); if (s) sessionStorage.setItem(`share_token_${shareInfo.uid}`, t); else throw new Error("Invalid token"); } }}
        onReturn={() => window.location.href = '/'}
      />
    );
  }

  if (!isAuthenticated && !isPublicView) return <Login onLogin={() => checkAuth()} onGuestLogin={handleGuestLogin} />;


  return (
    <SidebarProvider className="h-svh overflow-hidden">
      {!isOnline && !isPublicView && <OfflineOverlay />}

      {!isPublicView && (
        <AppSidebar 
          diagrams={diagrams} notes={notes} drawings={drawings} projects={projects} uncategorized={uncategorized} flowcharts={flowcharts}
          activeDiagramId={activeDiagramId} activeNoteId={activeNoteId} activeDrawingId={activeDrawingId} activeProjectId={activeProjectId} activeFlowchartId={activeFlowchartId}
          view={view}
          onDiagramSelect={handleDiagramSelect} onNoteSelect={handleNoteSelect} onDrawingSelect={handleDrawingSelect} onProjectSelect={handleProjectSelect} onFlowchartSelect={handleFlowchartSelect}

          onDiagramCreate={handleSidebarDiagramCreate}
          onNoteCreate={handleSidebarNoteCreate}
          onDrawingCreate={handleSidebarDrawingCreate}
          onFlowchartCreate={handleSidebarFlowchartCreate}
          onProjectCreate={handleSidebarProjectCreate}
          onProjectUpdate={handleSidebarProjectUpdate}
          onProjectDelete={handleSidebarProjectDelete}
          onDiagramUpdate={handleSidebarDiagramUpdate}
          onNoteUpdate={handleSidebarNoteUpdate}
          onDrawingUpdate={handleSidebarDrawingUpdate}
          onFlowchartUpdate={handleSidebarFlowchartUpdate}
          onDiagramDelete={handleSidebarDiagramDelete}
          onNoteDelete={handleSidebarNoteDelete}
          onDrawingDelete={handleSidebarDrawingDelete}
          onFlowchartDelete={handleSidebarFlowchartDelete}
          onLogout={handleLogout}
          onMoveDiagramToProject={handleSidebarMoveDiagramToProject}
          onMoveNoteToProject={handleSidebarMoveNoteToProject}
          onMoveDrawingToProject={handleSidebarMoveDrawingToProject}
          onMoveFlowchartToProject={handleSidebarMoveFlowchartToProject}
          sidebarView={sidebarView} onViewChange={handleViewChange}
          hasMoreProjects={hasMoreProjects} hasMoreDiagrams={hasMoreDiagrams} hasMoreNotes={hasMoreNotes} hasMoreDrawings={hasMoreDrawings} hasMoreFlowcharts={hasMoreFlowcharts}
          onLoadMoreProjects={handleSidebarLoadMoreProjects}
          onLoadMoreDiagrams={handleSidebarLoadMoreDiagrams}
          onLoadMoreNotes={handleSidebarLoadMoreNotes}
          onNoteCopyMarkdown={handleSidebarNoteCopyMarkdown}
          onNoteImportMarkdown={handleSidebarNoteImportMarkdown}
          onNoteExportMarkdown={handleSidebarNoteExportMarkdown}
          onLoadMoreDrawings={handleSidebarLoadMoreDrawings}
          onLoadMoreFlowcharts={handleSidebarLoadMoreFlowcharts}
          searchQuery={searchQuery} onSearchChange={setSearchQuery} user={user} isOnline={isOnline} isInstallable={isInstallable} onInstall={installApp}
          isProjectsLoading={isProjectsLoading}
          isDiagramsLoading={isDiagramsLoading}
          isNotesLoading={isNotesLoading}
          isDrawingsLoading={isDrawingsLoading}
          isFlowchartsLoading={isFlowchartsLoading}
          isTrashLoading={isTrashLoading}
        />
      )}


      <SidebarInset className={isPublicView ? "w-full" : ""}>
        <MainHeader 
          featureLabel={featureLabel} activeProjectName={activeProjectName} activeFileName={activeFileName} 
          view={view} hasActiveItem={isPublicView ? true : hasActiveItem} 
          syncError={syncError}
          isSyncing={isSyncing}
          isRefreshing={isRefreshing}
          hasPendingSyncs={hasPendingSyncs}
          onSave={syncDrafts}
          activeFileUid={activeFileUid} activeFileId={currentActiveId} initialShareSettings={initialShareSettings} isPublicView={isPublicView}
          onSettingsSaved={handleHeaderSettingsSaved}
          isOnline={isOnline}
          updatedAt={activeDocument?.updated_at}
          onDelete={handleHeaderDelete}
          onRename={handleHeaderRename}
          onExportSQL={handleHeaderExportSQL}
          onExportPDF={handleHeaderExportPDF}
          onExportImage={handleHeaderExportImage}
          onExportMarkdown={handleExportMarkdown}
          onCopyMarkdown={handleCopyMarkdown}
          onImportMarkdown={handleImportMarkdown}
          onDuplicate={handleDuplicate}
          isGuest={isGuest}
        />

        <ImportNoteModal 
          isOpen={isImportNoteModalOpen} 
          onClose={() => setIsImportNoteModalOpen(false)}
          onImport={executeImportMarkdown}
        />

        <ExportNoteModal
          isOpen={isExportNoteModalOpen}
          onClose={() => setIsExportNoteModalOpen(false)}
          onExport={(format, options, pageSize) => {
            if (activeNote) {
              if (format === 'markdown') {
                executeExportMarkdown();
              } else if (format === 'pdf') {
                NoteExporter.exportToPDF(activeNote as any, options, pageSize);
              } else if (format === 'print') {
                NoteExporter.printNote(activeNote as any);
              } else if (format === 'word') {
                NoteExporter.exportToWord(activeNote as any, options);
              }
            }
          }}
        />

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-0 overflow-hidden" style={{ isolation: 'isolate' }}>
          {!hasActiveItem && view !== 'trash' && view !== 'changelog' && view !== 'backups' && !isPublicView ? <WelcomeView /> : (
            <>
              {view === 'erd' && (isPublicView ? publicData : activeDiagramId) && (
                <ERDView 
                  isLoading={isDiagramsLoading || isERDItemLoading}
                  nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
                  onNodeClick={(e, n) => { if (!isPublicView && !(e.target as HTMLElement).closest('.nodrag')) setSelectedNodeId(n.id); }}
                  onNodeDoubleClick={(e, n) => { if (!isPublicView && !(e.target as HTMLElement).closest('.nodrag')) { setSelectedNodeId(n.id); setIsTablePropertiesOpen(true); } }}
                  onEdgeClick={(_, e) => { if (!isPublicView) setSelectedEdgeId(e.id); }}
                  onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
                  onMove={(_, v) => { viewportRef.current = v; }}
                  addEntity={addEntity}
                  openImportModal={() => setIsImportModalOpen(true)}
                  handleExportSQL={dialect => {
                    const target = isPublicView ? publicData : diagrams.find(f => f.id === activeDiagramId);
                    if (target) handleExportSQL(dialect, target, nodes, edges);
                  }}
                  handleExportPDF={() => {
                    const targetName = isPublicView ? (publicData?.name || 'Shared') : (diagrams.find(f => f.id === activeDiagramId)?.name || 'Diagram');
                    handleExportPDF(targetName);
                  }}
                  handleExportImage={() => {
                    const targetName = isPublicView ? (publicData?.name || 'Shared') : (diagrams.find(f => f.id === activeDiagramId)?.name || 'Diagram');
                    handleExportImage(targetName);
                  }}
                  isReadOnly={isPublicView}
                  undo={undo}
                  redo={redo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  takeSnapshot={takeSnapshot}
                  selectedNodeId={selectedNodeId}
                />
              )}
              {view === 'backups' && (
                <BackupsView />
              )}
              {view === 'erd' && (
                <ERDImportModal 
                  isOpen={isImportModalOpen}
                  onOpenChange={setIsImportModalOpen}
                  nodes={nodes}
                  edges={edges}
                  setNodes={setNodes}
                  setEdges={setEdges}
                  activeDiagramId={activeDiagramId}
                  takeSnapshot={takeSnapshot}
                  saveDiagram={saveDiagram}
                  triggerDebouncedSync={triggerDebouncedSync}
                  broadcastMessage={broadcastMessage}
                  setIsLocalSaving={setIsLocalSaving}
                  viewportRef={viewportRef}
                  lastLoadedDiagramIdRef={lastLoadedDiagramIdRef}
                />
              )}
              {view === 'notes' && activeNote && <NotesView isLoading={isNotesLoading || isNoteItemLoading} activeNoteId={isPublicView ? null : activeNoteId} activeNote={activeNote} saveNote={saveNote} handleNoteChange={handleNoteChange} deleteNote={deleteNote} isReadOnly={isPublicView} />}
              {view === 'drawings' && activeDrawing && <DrawingsView isLoading={isDrawingsLoading || isDrawingItemLoading} activeDrawingId={isPublicView ? null : activeDrawingId} activeDrawing={activeDrawing} saveDrawing={saveDrawing} handleDrawingChange={handleDrawingChange} deleteDrawing={deleteDrawing} isReadOnly={isPublicView} />}
              {view === 'flowchart' && activeFlowchart && <FlowchartView isLoading={isFlowchartsLoading || isFlowchartItemLoading} activeFlowchartId={activeFlowchartId} activeFlowchart={activeFlowchart} handleFlowchartChange={handleFlowchartChange} isReadOnly={isPublicView} />}
              {view === 'changelog' && <ChangelogView />}
            </>
          )}
          {view === 'trash' && (
            <TrashView 
              trashData={trashData} 
              restoreProject={async (id) => { await restoreProject(id); await fetchTrash(); await fetchProjects(); }} 
              restoreDiagram={async (id) => { await restoreDiagram(id); await fetchTrash(); await fetchProjects(); await fetchDiagrams(false, 'all', debouncedSearchQuery, null, 50, { silent: true }); }} 
              restoreNote={async (id) => { await restoreNote(id); await fetchTrash(); await fetchProjects(); await fetchNotes(false, 'all', debouncedSearchQuery, null, 50, { silent: true }); }} 
              restoreDrawing={async (id) => { await restoreDrawing(id); await fetchTrash(); await fetchProjects(); await fetchDrawings(false, 'all', debouncedSearchQuery, null, 50, { silent: true }); }} 
              restoreFlowchart={async (id) => { await restoreFlowchart(id); await fetchTrash(); await fetchProjects(); await fetchFlowcharts(false, 'all', debouncedSearchQuery, null, 50, { silent: true }); }} 
              fetchTrash={fetchTrash} 
              handleProjectPermanentDelete={id => { setItemToDelete({ id, type: 'project' }); setIsPermanentDeleteConfirmOpen(true); }} 
              handleDiagramPermanentDelete={id => { setItemToDelete({ id, type: 'erd' }); setIsPermanentDeleteConfirmOpen(true); }} 
              handleNotePermanentDelete={id => { setItemToDelete({ id, type: 'notes' }); setIsPermanentDeleteConfirmOpen(true); }} 
              handleDrawingPermanentDelete={id => { setItemToDelete({ id, type: 'drawings' }); setIsPermanentDeleteConfirmOpen(true); }} 
              handleFlowchartPermanentDelete={id => { setItemToDelete({ id, type: 'flowchart' as any }); setIsPermanentDeleteConfirmOpen(true); }} 
              isLoading={isTrashLoading}
            />
          )}
        </div>

        <FeedbackDialog />

        <DeleteConfirmModal isOpen={isPermanentDeleteConfirmOpen} onOpenChange={setIsPermanentDeleteConfirmOpen} onConfirm={confirmPermanentDelete} onCancel={() => setItemToDelete(null)} itemType={itemToDelete?.type || ''} />

        {/* Entity Properties Modal */}
        {!isPublicView && (
          <TablePropertiesModal
            isOpen={isTablePropertiesOpen && !!selectedNodeId}
            onOpenChange={setIsTablePropertiesOpen}
            selectedEntity={selectedEntity}
            handleEntityUpdate={handleEntityUpdate}
            deleteEntity={deleteEntity}
            setSelectedNodeId={setSelectedNodeId}
            setIsDeleteAlertOpen={setIsDeleteAlertOpen}
          />
        )}

        {/* Rename Dialog */}
        {!isPublicView && (
          <RenameDocumentDialog
            isOpen={isRenameDialogOpen}
            onOpenChange={setIsRenameDialogOpen}
            view={view}
            activeDocument={activeDocument}
            newName={newName}
            setNewName={setNewName}
            projects={projects}
            selectedProjectId={renameProjectId}
            setSelectedProjectId={setRenameProjectId}
            updateDiagram={updateDiagram}
            updateNote={updateNote}
            updateDrawing={updateDrawing}
            updateFlowchart={updateFlowchart}
            onMoveDiagramToProject={moveDiagramToProject}
            onMoveNoteToProject={moveNoteToProject}
            onMoveDrawingToProject={moveDrawingToProject}
            onMoveFlowchartToProject={moveFlowchartToProject}
            onRenameSuccess={fetchProjects}
          />
        )}

        {/* Move to Trash Confirmation Alert */}
        <MoveToTrashAlert
          isOpen={isMoveToTrashAlertOpen}
          onOpenChange={setIsMoveToTrashAlertOpen}
          activeDocument={activeDocument}
          view={view}
          deleteDiagram={deleteDiagram}
          deleteNote={deleteNote}
          deleteDrawing={deleteDrawing}
          deleteFlowchart={deleteFlowchart}
          fetchTrash={fetchTrash}
        />


        {/* Relationship Properties Modal */}
        {!isPublicView && (
          <RelationshipPropertiesModal
            isOpen={!!selectedEdgeId}
            onOpenChange={(open) => { if (!open) setSelectedEdgeId(null); }}
            selectedEdge={edges.find(e => e.id === selectedEdgeId) || null}
            nodes={nodes}
            handleEdgeUpdate={handleEdgeUpdate}
            deleteEdge={deleteEdge}
          />
        )}

        {/* Delete Confirmation Alert */}
        <DeleteEntityAlert
          isOpen={isDeleteAlertOpen}
          onOpenChange={setIsDeleteAlertOpen}
          selectedEntity={selectedEntity}
          deleteEntity={deleteEntity}
          setSelectedNodeId={setSelectedNodeId}
        />


        {/* Duplicate Document Dialog */}
        <DuplicateDocumentDialog
          isOpen={isDuplicateDialogOpen}
          onOpenChange={setIsDuplicateDialogOpen}
          view={view}
          duplicateName={duplicateName}
          setDuplicateName={setDuplicateName}
          executeDuplicate={executeDuplicate}
          isRefreshing={isRefreshing}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}
