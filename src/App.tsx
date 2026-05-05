import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  ReactFlowProvider,
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
import { Entity, DraftType, Relationship } from './types';

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
  const [isNotePropertiesOpen, setIsNotePropertiesOpen] = useState(false);

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
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const lastLoadedDiagramIdRef = useRef<number | string | null>(null);
  const lastLoadedNoteIdRef = useRef<number | string | null>(null);
  const lastLoadedDrawingIdRef = useRef<number | string | null>(null);
  const lastLoadedFlowchartIdRef = useRef<number | string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isIncomingSyncRef = useRef(false);
  const lastSaveCallRef = useRef<number>(0);
  const lastFocusFetchRef = useRef<number>(0);

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

  const { 
    nodes, setNodes, onNodesChange,
    edges, setEdges, onEdgesChange,
    selectedNodeId, setSelectedNodeId,
    selectedEdgeId, setSelectedEdgeId,
    onConnect, addEntity, updateEntity, deleteEntity, handleEdgeUpdate, deleteEdge,
    handleDiagramSelect: selectDiagram, viewportRef,
    undo, redo, canUndo, canRedo, takeSnapshot, isItemLoading: isERDItemLoading, saveCounter
  } = useERDSession(isPublicView, isGuest, isAuthenticated, setView, {
    broadcastNodeMove: (id, x, y) => broadcastNodeMove(id, x, y),
    broadcastNodeUpdate: (id, data) => broadcastNodeUpdate(id, data),
    broadcastEdgesUpdate: (edges) => broadcastEdgesUpdate(edges),
  });

  // Effective ID for realtime sync (works for both owner and public guest)
  const effectiveDiagramId = isPublicView ? publicData?.id : activeDiagramId;

  const { broadcastNodeMove, broadcastNodeUpdate, broadcastEdgesUpdate } = useRealtimeSync(
    effectiveDiagramId,
    setNodes,
    setEdges
  );

  const { 
    notes, setNotes, activeNoteId, setActiveNoteId, fetchNotes, createNote, updateNote, deleteNote, moveNoteToProject, saveNote, restoreNote, deleteNotePermanent,
    hasMoreNotes, isLoading: isNotesLoading, isItemLoading: isNoteItemLoading, selectNote, duplicateNote
  } = useNotes(isGuest);
  
  const { 
    projects, 
    setProjects, 
    uncategorized,
    setUncategorized,
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
    if (activeDiagramId && !isERDItemLoading) lastLoadedDiagramIdRef.current = activeDiagramId;
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
      if (isLocalSaving) {
        e.preventDefault();
        e.returnValue = ''; // Required by modern browsers to trigger the dialog
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLocalSaving]);

  // Intelligent Fetch on Focus: Refresh data when returning to tab
  useEffect(() => {
    const handleFocus = async () => {
      // Only refresh if online, authenticated, not in public view, and not currently saving/syncing
      if (!isOnline || !isAuthenticated || isPublicView || isLocalSaving || isRefreshing || isSyncing) return;
      
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
    isOnline, isAuthenticated, isPublicView, isLocalSaving, isRefreshing, isSyncing,
    view, debouncedSearchQuery,
    activeDiagramId, activeNoteId, activeDrawingId, activeFlowchartId,
    fetchDiagrams, fetchNotes, fetchDrawings, fetchFlowcharts,
    selectDiagram, selectNote, selectDrawing, selectFlowchart,
    setActiveDiagramId
  ]);

  // Emergency Flush: Save immediately when switching tabs or minimizing
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isLocalSaving) {
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
  }, [view, activeDiagramId, activeNoteId, activeDrawingId, activeFlowchartId, nodes, edges, isLocalSaving, saveDiagram, saveNote, saveDrawing, saveFlowchart, triggerDebouncedSync, notes, drawings, flowcharts]);

  // ERD Auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (activeDiagramId && (isAuthenticated || isGuest) && view === 'erd' && !isPublicView) {
      // Prevent loop: If this change came from another tab's sync, DON'T save it back
      if (isIncomingSyncRef.current) {
        console.log("[SaveGuard] Skipping save: Change was from an incoming sync");
        return;
      }

      setIsLocalSaving(true);
      
      saveTimeoutRef.current = setTimeout(async () => {
        // SAFETY 1: ID Validation Guard
        if (lastLoadedDiagramIdRef.current !== activeDiagramId) return;

        // SAFETY 2: Loading/Refresh Guard - Wait if still loading
        if (isRefreshing || isERDItemLoading || isDiagramsLoading) {
          console.log("[SaveGuard] Deferring save: App is refreshing/loading");
          return; 
        }

        // SAFETY 3: Hard Guard for empty states
        // Never save a completely empty ERD automatically unless we are absolutely sure 
        // it's not a loading/race condition error.
        if (nodes.length === 0) {
           console.warn("[SaveGuard] Blocking auto-save of empty ERD to prevent data loss");
           return;
        }
        await saveDiagram(nodes, edges, viewportRef.current);
        lastSaveCallRef.current = Date.now();
        setIsLocalSaving(false);
        triggerDebouncedSync();
        broadcastMessage(BroadcastMessageType.DRAFT_UPDATED, DraftType.ERD, activeDiagramId);
      }, 800);
    }
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [nodes, edges, saveCounter, activeDiagramId, isAuthenticated, isGuest, view, saveDiagram, isPublicView, triggerDebouncedSync, isRefreshing, isERDItemLoading, isDiagramsLoading, broadcastMessage]);

  // Handlers
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
      const currentNodes = nodes.map(node => 
        node.id === updatedEntity.id ? { ...node, data: updatedEntity } : node
      );
      await saveDiagram(currentNodes, edges, viewportRef.current);
      lastSaveCallRef.current = Date.now();
      
      // 2. Instant Cloud Sync (Supabase)
      syncDrafts();

      // 3. Broadcast update to other clients
      broadcastNodeUpdate(updatedEntity.id, updatedEntity);
    }
  }, [updateEntity, nodes, edges, saveDiagram, viewportRef, syncDrafts, broadcastNodeUpdate]);

  const flushPendingSaves = async () => {
    if (!isLocalSaving) return;

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
  };

  const handleDiagramSelect = async (id: number | string) => {
    await flushPendingSaves();
    await selectDiagram(id, (newId) => {
      setActiveDiagramId(newId);
      lastLoadedDiagramIdRef.current = newId;
    });
  };
  const handleEditEntity = useCallback((e: any) => {
    setSelectedNodeId(e.detail);
    setIsTablePropertiesOpen(true);
  }, [setSelectedNodeId]);
  const handleDeleteEntity = useCallback((e: any) => deleteEntity(e.detail), [deleteEntity]);

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


  const handleNoteSelect = async (id: number | string) => {
    if (activeNoteId === id && view === 'notes') return; // Already active — don't reload
    await flushPendingSaves();
    setView('notes');
    // Clear current note content to avoid showing stale data while loading
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content: undefined } : n));
    await selectNote(id);
    lastLoadedNoteIdRef.current = id;
  };

  const handleDrawingSelect = async (id: number | string) => {
    if (activeDrawingId === id && view === 'drawings') return; // Already active — don't reload
    await flushPendingSaves();
    setView('drawings');
    // Clear current drawing data to avoid showing stale data while loading
    setDrawings(prev => prev.map(d => d.id === id ? { ...d, data: undefined } : d));
    await selectDrawing(id);
    lastLoadedDrawingIdRef.current = id;
  };

  const handleFlowchartSelect = async (id: number | string) => {
    if (activeFlowchartId === id && view === 'flowchart') return; // Already active — don't reload
    await flushPendingSaves();
    setView('flowchart');
    // Clear current flowchart data to avoid showing stale data while loading
    setFlowcharts(prev => prev.map(f => f.id === id ? { ...f, data: undefined } : f));
    await selectFlowchart(id);
    lastLoadedFlowchartIdRef.current = id;
  };

  const notesSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleNoteChange = useCallback((content: string) => {
    if (!activeNoteId) return;
    
    // Prevent loop: If this change came from another tab's sync, DON'T save it back
    if (isIncomingSyncRef.current) return;

    const noteId = activeNoteId;
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content } : n));
    
    setIsLocalSaving(true);
    if (notesSaveTimeout.current) clearTimeout(notesSaveTimeout.current);
    
    // Capture metadata at the time of change to avoid stale closure issues in the timeout
    const currentNote = notes.find(n => String(n.id) === String(noteId));
    if (!activeNoteId || !currentNote) return;

    // SAFETY: Note ID Validation Guard
    if (lastLoadedNoteIdRef.current !== activeNoteId) return;

    notesSaveTimeout.current = setTimeout(async () => {
      // SAFETY: Wait if still loading/refreshing
      if (isRefreshing || isNoteItemLoading) return;
      
      const n = notes.find(n => String(n.id) === String(noteId));
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
  }, [activeNoteId, notes, saveNote, setNotes, triggerDebouncedSync, isRefreshing, isNoteItemLoading, broadcastMessage]);

  const drawingsSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleDrawingChange = useCallback((data: string) => {
    if (!activeDrawingId) return;
    
    // Prevent loop: If this change came from another tab's sync, DON'T save it back
    if (isIncomingSyncRef.current) return;

    const drawingId = activeDrawingId;
    setDrawings(prev => prev.map(d => String(d.id) === String(drawingId) ? { ...d, data } : d));
    
    setIsLocalSaving(true);
    if (drawingsSaveTimeout.current) clearTimeout(drawingsSaveTimeout.current);
    
    const currentDrawing = drawings.find(d => String(d.id) === String(drawingId));
    if (!activeDrawingId || !currentDrawing) return;
    const title = currentDrawing?.title || '';
    const project_id = currentDrawing?.project_id || null;

    // SAFETY: Drawing ID Validation Guard
    if (lastLoadedDrawingIdRef.current !== activeDrawingId) return;

    drawingsSaveTimeout.current = setTimeout(async () => {
      // SAFETY: Wait if still loading/refreshing
      if (isRefreshing || isDrawingItemLoading) return;
      await saveDrawing({
        id: drawingId, data, title, project_id
      } as any);
      lastSaveCallRef.current = Date.now();
      setIsLocalSaving(false);
      triggerDebouncedSync();
      broadcastMessage(BroadcastMessageType.DRAFT_UPDATED, DraftType.DRAWINGS, activeDrawingId);
    }, 1500);
  }, [activeDrawingId, drawings, saveDrawing, setDrawings, triggerDebouncedSync, isRefreshing, isDrawingItemLoading, broadcastMessage]);
  
  const flowchartsSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleFlowchartChange = useCallback((nodesData: any[], edgesData: any[]) => {
    if (!activeFlowchartId) return;

    // Prevent loop: If this change came from another tab's sync, DON'T save it back
    if (isIncomingSyncRef.current) return;

    const flowchartId = activeFlowchartId;
    const dataString = JSON.stringify({ nodes: nodesData, edges: edgesData });
    setFlowcharts(prev => prev.map(f => String(f.id) === String(flowchartId) ? { ...f, data: dataString } : f));
    
    setIsLocalSaving(true);
    if (flowchartsSaveTimeout.current) clearTimeout(flowchartsSaveTimeout.current);
    
    const currentFlowchart = flowcharts.find(f => String(f.id) === String(flowchartId));
    if (!activeFlowchartId || !currentFlowchart) return;
    const title = currentFlowchart?.title || '';
    const project_id = currentFlowchart?.project_id || null;

    // SAFETY: Flowchart ID Validation Guard
    if (lastLoadedFlowchartIdRef.current !== activeFlowchartId) return;

    flowchartsSaveTimeout.current = setTimeout(async () => {
      // SAFETY: Wait if still loading/refreshing
      if (isRefreshing || isFlowchartItemLoading) return;
      await saveFlowchart({
        id: flowchartId, data: dataString, title, project_id
      } as any);
      lastSaveCallRef.current = Date.now();
      setIsLocalSaving(false);
      triggerDebouncedSync();
      broadcastMessage(BroadcastMessageType.DRAFT_UPDATED, DraftType.FLOWCHART, activeFlowchartId);
    }, 800);
  }, [activeFlowchartId, flowcharts, saveFlowchart, setFlowcharts, triggerDebouncedSync, isRefreshing, isFlowchartItemLoading, broadcastMessage]);

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

  useUpdateCheck(() => handleViewChange('changelog'));

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
      fetchTrash();
    }
  };

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
          diagrams={diagrams} notes={notes} drawings={drawings} flowcharts={flowcharts} projects={projects} uncategorized={uncategorized}
          activeDiagramId={activeDiagramId} activeNoteId={activeNoteId} activeDrawingId={activeDrawingId} activeFlowchartId={activeFlowchartId} activeProjectId={activeProjectId} view={view}
          onDiagramSelect={handleDiagramSelect} onNoteSelect={handleNoteSelect} onDrawingSelect={handleDrawingSelect} onFlowchartSelect={handleFlowchartSelect} onProjectSelect={setActiveProjectId}
          onDiagramCreate={async (n, pid) => { const f = await createDiagram(n, pid); if (f) { await fetchProjects(); handleDiagramSelect(f.id); } }}
          onNoteCreate={async (t, pid) => { const n = await createNote(t, pid); if (n) { await fetchProjects(); handleNoteSelect(n.id); } }}
          onDrawingCreate={async (t, pid) => { const d = await createDrawing(t, pid); if (d) { await fetchProjects(); handleDrawingSelect(d.id); } }}
          onFlowchartCreate={async (t, pid) => { const f = await createFlowchart(t, pid); if (f) { await fetchProjects(); handleFlowchartSelect(f.id); } }}
          onProjectCreate={async (n) => { await createProject(n); await fetchProjects(); }} 
          onProjectUpdate={async (id, n) => { await updateProject(id, n); await fetchProjects(); }} 
          onProjectDelete={async id => { await deleteProject(id); fetchTrash(); await fetchProjects(); }}
          onDiagramUpdate={async (id, n, opts) => { await updateDiagram(id, n, opts); await fetchProjects(); }} 
          onNoteUpdate={async (id, t, opts) => { await updateNote(id, t, opts); await fetchProjects(); }} 
          onDrawingUpdate={async (id, t, opts) => { await updateDrawing(id, t, opts); await fetchProjects(); }} 
          onFlowchartUpdate={async (id, t, opts) => { await updateFlowchart(id, t, opts); await fetchProjects(); }}
          onDiagramDelete={async id => { await deleteDiagram(id); fetchTrash(); fetchProjects(); }} 
          onNoteDelete={async id => { await deleteNote(id); fetchTrash(); fetchProjects(); }} 
          onDrawingDelete={async id => { await deleteDrawing(id); fetchTrash(); fetchProjects(); }} 
          onFlowchartDelete={async id => { await deleteFlowchart(id); fetchTrash(); fetchProjects(); }}
          onLogout={handleLogout}
          onMoveDiagramToProject={async (id, pid, opts) => { await moveDiagramToProject(id, pid, opts); await fetchProjects(); }} 
          onMoveNoteToProject={async (id, pid, opts) => { await moveNoteToProject(id, pid, opts); await fetchProjects(); }} 
          onMoveDrawingToProject={async (id, pid, opts) => { await moveDrawingToProject(id, pid, opts); await fetchProjects(); }} 
          onMoveFlowchartToProject={async (id, pid, opts) => { await moveFlowchartToProject(id, pid, opts); await fetchProjects(); }}
          sidebarView={sidebarView} onViewChange={handleViewChange}
          hasMoreProjects={hasMoreProjects} hasMoreDiagrams={hasMoreDiagrams} hasMoreNotes={hasMoreNotes} hasMoreDrawings={hasMoreDrawings} hasMoreFlowcharts={hasMoreFlowcharts}
          onLoadMoreProjects={() => fetchProjects(true, searchQuery)} onLoadMoreDiagrams={() => fetchDiagrams(true, activeProjectId === null ? 'all' : activeProjectId, searchQuery)}
          onLoadMoreNotes={() => fetchNotes(true, activeProjectId === null ? 'all' : activeProjectId, searchQuery)} 
          onNoteCopyMarkdown={async (id) => {
            const note = notes.find(n => n.id === id);
            if (note) await copyMarkdownToClipboard(note.content || '');
          }}
          onNoteImportMarkdown={(id) => {
            handleNoteSelect(id);
            setTimeout(() => setIsImportNoteModalOpen(true), 100);
          }}
          onNoteExportMarkdown={(id) => {
            handleNoteSelect(id);
            setTimeout(() => setIsExportNoteModalOpen(true), 100);
          }}
          onLoadMoreDrawings={() => fetchDrawings(true, activeProjectId === null ? 'all' : activeProjectId, searchQuery)}
          onLoadMoreFlowcharts={() => fetchFlowcharts(true, activeProjectId === null ? 'all' : activeProjectId, searchQuery)}
          searchQuery={searchQuery} onSearchChange={setSearchQuery} user={user} isOnline={isOnline} isInstallable={isInstallable} onInstall={installApp}
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
          onSettingsSaved={() => { 
            const pid = 'all'; 
            if (view === 'erd') fetchDiagrams(false, pid, debouncedSearchQuery, null, 50); 
            else if (view === 'notes') fetchNotes(false, pid, debouncedSearchQuery, null, 50); 
            else if (view === 'drawings') fetchDrawings(false, pid, debouncedSearchQuery, null, 50); 
            else if (view === 'flowchart') fetchFlowcharts(false, pid, debouncedSearchQuery, null, 50); 
          }}
          isOnline={isOnline}
          updatedAt={activeDocument?.updated_at}
          onDelete={() => {
            if (!currentActiveId) return;
            setIsMoveToTrashAlertOpen(true);
          }}
          onRename={() => {
            if (!activeDocument) return;
            setNewName(activeDocument.title || activeDocument.name || "");
            setRenameProjectId(activeDocument.project_id?.toString() || activeDocument.projectId?.toString() || "none");
            setIsRenameDialogOpen(true);
          }}
          onExportSQL={(dialect) => {
            if (activeDocument) {
              handleExportSQL(dialect, { name: activeFileName || 'Untitled' }, nodes, edges);
            }
          }}
          onExportPDF={() => {
            if (activeDocument) {
              handleExportPDF(activeFileName || 'Untitled');
            }
          }}
          onExportImage={() => {
            if (activeDocument) {
              handleExportImage(activeFileName || 'Untitled');
            }
          }}
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

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-0 overflow-hidden">
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
              restoreProject={async (id) => { await restoreProject(id); fetchTrash(); await fetchProjects(); }} 
              restoreDiagram={async (id) => { await restoreDiagram(id); fetchTrash(); await fetchProjects(); await fetchDiagrams(false, 'all', debouncedSearchQuery, null, 50, { silent: true }); }} 
              restoreNote={async (id) => { await restoreNote(id); fetchTrash(); await fetchProjects(); await fetchNotes(false, 'all', debouncedSearchQuery, null, 50, { silent: true }); }} 
              restoreDrawing={async (id) => { await restoreDrawing(id); fetchTrash(); await fetchProjects(); await fetchDrawings(false, 'all', debouncedSearchQuery, null, 50, { silent: true }); }} 
              restoreFlowchart={async (id) => { await restoreFlowchart(id); fetchTrash(); await fetchProjects(); await fetchFlowcharts(false, 'all', debouncedSearchQuery, null, 50, { silent: true }); }} 
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
