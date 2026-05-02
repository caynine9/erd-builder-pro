import * as React from "react"
import { useSidebar } from "@/components/ui/sidebar"
import { Diagram, Project, Note, Drawing, Flowchart } from "../types"

// Refactored Components
import { SidebarModals } from "./sidebar/modals/SidebarModals"
import { ProjectGroup } from "./sidebar/sections/ProjectGroup"
import { FileGroup } from "./sidebar/sections/FileGroup"

export function NavProjects({
  projects,
  activeProjectId,
  onProjectSelect,
  onProjectDelete,
  onProjectUpdate,
  onProjectCreate,
  onDiagramCreate,
  onNoteCreate,
  onDrawingCreate,
  onFlowchartCreate,
  diagrams,
  notes,
  drawings,
  flowcharts,
  onDiagramSelect,
  onNoteSelect,
  onDrawingSelect,
  onFlowchartSelect,
  activeDiagramId,
  activeNoteId,
  activeDrawingId,
  activeFlowchartId,
  view,
  sidebarView,
  onDiagramDelete,
  onNoteDelete,
  onDrawingDelete,
  onFlowchartDelete,
  onDiagramUpdate,
  onNoteUpdate,
  onDrawingUpdate,
  onFlowchartUpdate,
  onMoveDiagramToProject,
  onMoveNoteToProject,
  onMoveDrawingToProject,
  onMoveFlowchartToProject,
  allProjects,
  searchQuery,
  hasMoreProjects,
  hasMoreDiagrams,
  hasMoreNotes,
  hasMoreDrawings,
  hasMoreFlowcharts,
  onLoadMoreProjects,
  onLoadMoreDiagrams,
  onLoadMoreNotes,
  onLoadMoreDrawings,
  onLoadMoreFlowcharts,
  isOnline,
  isProjectsLoading,
  isDiagramsLoading,
  isNotesLoading,
  isDrawingsLoading,
  isFlowchartsLoading,
}: {
  projects: any[]
  activeProjectId: number | string | null
  onProjectSelect: (id: number | string | null) => void
  onProjectDelete: (id: number | string) => void
  onProjectUpdate: (id: number | string, name: string) => void
  onProjectCreate: (name: string) => void
  onDiagramCreate: (name: string, projectId: number | string | null) => void
  onNoteCreate: (title: string, projectId: number | string | null) => void
  onDrawingCreate: (title: string, projectId: number | string | null) => void
  onFlowchartCreate: (title: string, projectId: number | string | null) => void
  diagrams: Diagram[]
  notes: Note[]
  drawings: Drawing[]
  flowcharts: Flowchart[]
  onDiagramSelect: (id: number | string) => void
  onNoteSelect: (id: number | string) => void
  onDrawingSelect: (id: number | string) => void
  onFlowchartSelect: (id: number | string) => void
  activeDiagramId: number | string | null
  activeNoteId: number | string | null
  activeDrawingId: number | string | null
  activeFlowchartId: number | string | null
  view: 'erd' | 'notes' | 'drawings' | 'trash' | 'flowchart' | 'changelog' | 'backups'
  sidebarView: 'erd' | 'notes' | 'drawings' | 'flowchart' | 'changelog'
  onDiagramDelete: (id: number | string) => void
  onNoteDelete: (id: number | string) => void
  onDrawingDelete: (id: number | string) => void
  onFlowchartDelete: (id: number | string) => void
  onDiagramUpdate: (id: number | string, name: string) => void
  onNoteUpdate: (id: number | string, title: string) => void
  onDrawingUpdate: (id: number | string, title: string) => void
  onFlowchartUpdate: (id: number | string, title: string) => void
  onMoveDiagramToProject: (diagramId: number | string, projectId: number | string | null) => void
  onMoveNoteToProject: (noteId: number | string, projectId: number | string | null) => void
  onMoveDrawingToProject: (drawingId: number | string, projectId: number | string | null) => void
  onMoveFlowchartToProject: (flowchartId: number | string, projectId: number | string | null) => void
  allProjects: Project[]
  searchQuery: string
  hasMoreProjects?: boolean
  hasMoreDiagrams?: boolean
  hasMoreNotes?: boolean
  hasMoreDrawings?: boolean
  hasMoreFlowcharts?: boolean
  onLoadMoreProjects?: () => void
  onLoadMoreDiagrams?: () => void
  onLoadMoreNotes?: () => void
  onLoadMoreDrawings?: () => void
  onLoadMoreFlowcharts?: () => void
  isOnline: boolean
  isProjectsLoading?: boolean
  isDiagramsLoading?: boolean
  isNotesLoading?: boolean
  isDrawingsLoading?: boolean
  isFlowchartsLoading?: boolean
}) {
  const { isMobile } = useSidebar()
  
  // Dialog States
  const [isProjectDialogOpen, setIsProjectDialogOpen] = React.useState(false)
  const [isFileDialogOpen, setIsFileDialogOpen] = React.useState(false)
  const [isEditFileDialogOpen, setIsEditFileDialogOpen] = React.useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false)
  
  const [projectName, setProjectName] = React.useState("")
  const [fileName, setFileName] = React.useState("")
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("none")
  
  const [editingProjectId, setEditingProjectId] = React.useState<number | string | null>(null)
  const [editingProjectName, setEditingProjectName] = React.useState("")
  
  const [editingFile, setEditingFile] = React.useState<{ id: number | string, name: string, projectId: number | string | null, type: 'erd' | 'notes' | 'drawings' | 'flowchart' } | null>(null)
  const [deletingFile, setDeletingFile] = React.useState<{ id: number | string, type: 'erd' | 'notes' | 'drawings' | 'flowchart' } | null>(null)
  const [deletingProject, setDeletingProject] = React.useState<{ id: number | string, name: string } | null>(null)
  const [isProjectDeleteConfirmOpen, setIsProjectDeleteConfirmOpen] = React.useState(false)

  const handleCreateProject = () => {
    if (projectName.trim()) {
      onProjectCreate(projectName.trim())
      setProjectName("")
      setIsProjectDialogOpen(false)
    }
  }

  const handleCreateFile = () => {
    if (fileName.trim()) {
      const projectId = selectedProjectId === "none" ? null : selectedProjectId
      if (sidebarView === 'erd') {
        onDiagramCreate(fileName.trim(), projectId)
      } else if (sidebarView === 'notes') {
        onNoteCreate(fileName.trim(), projectId)
      } else if (sidebarView === 'drawings') {
        onDrawingCreate(fileName.trim(), projectId)
      } else if (sidebarView === 'flowchart') {
        onFlowchartCreate(fileName.trim(), projectId)
      }
      setFileName("")
      setIsFileDialogOpen(false)
    }
  }

  const handleUpdateFile = async () => {
    if (editingFile && editingFile.name.trim()) {
      const projectId = selectedProjectId === "none" ? null : selectedProjectId
      
      if (editingFile.type === 'erd') {
        await onDiagramUpdate(editingFile.id, editingFile.name.trim())
        if (projectId !== editingFile.projectId) await onMoveDiagramToProject(editingFile.id, projectId)
      } else if (editingFile.type === 'notes') {
        await onNoteUpdate(editingFile.id, editingFile.name.trim())
        if (projectId !== editingFile.projectId) await onMoveNoteToProject(editingFile.id, projectId)
      } else if (editingFile.type === 'drawings') {
        await onDrawingUpdate(editingFile.id, editingFile.name.trim())
        if (projectId !== editingFile.projectId) await onMoveDrawingToProject(editingFile.id, projectId)
      } else if (editingFile.type === 'flowchart') {
        await onFlowchartUpdate(editingFile.id, editingFile.name.trim())
        if (projectId !== editingFile.projectId) await onMoveFlowchartToProject(editingFile.id, projectId)
      }
      
      setIsEditFileDialogOpen(false)
      setEditingFile(null)
    }
  }

  const handleDeleteConfirm = () => {
    if (deletingFile) {
      if (deletingFile.type === 'erd') onDiagramDelete(deletingFile.id)
      else if (deletingFile.type === 'notes') onNoteDelete(deletingFile.id)
      else if (deletingFile.type === 'drawings') onDrawingDelete(deletingFile.id)
      else if (deletingFile.type === 'flowchart') onFlowchartDelete(deletingFile.id)
      
      setIsDeleteConfirmOpen(false)
      setDeletingFile(null)
    }
  }

  const getFileCount = (projectId: number | string | null, viewFilter?: string) => {
    const currentView = viewFilter || sidebarView;
    const dCount = (diagrams || []).filter(f => !f.is_deleted && (projectId === null || String(f.project_id) === String(projectId)) && (currentView === 'erd')).length
    const nCount = (notes || []).filter(n => !n.is_deleted && (projectId === null || String(n.project_id) === String(projectId)) && (currentView === 'notes')).length
    const drCount = (drawings || []).filter(d => !d.is_deleted && (projectId === null || String(d.project_id) === String(projectId)) && (currentView === 'drawings')).length
    const fCount = (flowcharts || []).filter(f => !f.is_deleted && (projectId === null || String(f.project_id) === String(projectId)) && (currentView === 'flowchart')).length
    
    if (currentView === 'erd') return dCount;
    if (currentView === 'notes') return nCount;
    if (currentView === 'drawings') return drCount;
    if (currentView === 'flowchart') return fCount;
    return dCount + nCount + drCount + fCount;
  }

  const getFilesForCurrentView = () => {
    switch (sidebarView) {
      case 'erd': return diagrams || []
      case 'notes': return notes || []
      case 'drawings': return drawings || []
      case 'flowchart': return flowcharts || []
      default: return []
    }
  }

  const getActiveFileId = () => {
    switch (sidebarView) {
      case 'erd': return activeDiagramId
      case 'notes': return activeNoteId
      case 'drawings': return activeDrawingId
      case 'flowchart': return activeFlowchartId
      default: return null
    }
  }

  const getOnFileSelect = () => {
    switch (sidebarView) {
      case 'erd': return onDiagramSelect
      case 'notes': return onNoteSelect
      case 'drawings': return onDrawingSelect
      case 'flowchart': return onFlowchartSelect
      default: return () => {}
    }
  }

  return (
    <>
      <ProjectGroup 
        projects={projects}
        activeProjectId={activeProjectId}
        isOnline={isOnline}
        isProjectsLoading={!!isProjectsLoading}
        hasMoreProjects={!!hasMoreProjects}
        sidebarView={sidebarView}
        isMobile={isMobile}
        onProjectSelect={onProjectSelect}
        onProjectCreateClick={() => {
          setEditingProjectId(null)
          setProjectName("")
          setIsProjectDialogOpen(true)
        }}
        onLoadMoreProjects={onLoadMoreProjects}
        setEditingProjectId={setEditingProjectId}
        setEditingProjectName={setEditingProjectName}
        setIsProjectDialogOpen={setIsProjectDialogOpen}
        setDeletingProject={setDeletingProject}
        setIsProjectDeleteConfirmOpen={setIsProjectDeleteConfirmOpen}
        getFileCount={getFileCount}
      />

      <FileGroup 
        sidebarView={sidebarView}
        view={view}
        isOnline={isOnline}
        isLoading={
          (sidebarView === 'erd' && !!isDiagramsLoading) || 
          (sidebarView === 'notes' && !!isNotesLoading) || 
          (sidebarView === 'drawings' && !!isDrawingsLoading) || 
          (sidebarView === 'flowchart' && !!isFlowchartsLoading)
        }
        hasMore={
          (sidebarView === 'erd' && !!hasMoreDiagrams) || 
          (sidebarView === 'notes' && !!hasMoreNotes) || 
          (sidebarView === 'drawings' && !!hasMoreDrawings) || 
          (sidebarView === 'flowchart' && !!hasMoreFlowcharts)
        }
        searchQuery={searchQuery}
        files={getFilesForCurrentView().filter(f => !f.is_deleted && (activeProjectId === null || String(f.project_id) === String(activeProjectId)))}
        activeFileId={getActiveFileId()}
        onFileSelect={getOnFileSelect()}
        onAddClick={() => {
          setSelectedProjectId(activeProjectId?.toString() || "none")
          setFileName("")
          setIsFileDialogOpen(true)
        }}
        onLoadMore={
          sidebarView === 'erd' ? onLoadMoreDiagrams! : 
          sidebarView === 'notes' ? onLoadMoreNotes! : 
          sidebarView === 'drawings' ? onLoadMoreDrawings! : 
          onLoadMoreFlowcharts!
        }
        setEditingFile={setEditingFile}
        setSelectedProjectId={setSelectedProjectId}
        setIsEditFileDialogOpen={setIsEditFileDialogOpen}
        setDeletingFile={setDeletingFile}
        setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
      />

      <SidebarModals 
        isProjectDialogOpen={isProjectDialogOpen}
        setIsProjectDialogOpen={setIsProjectDialogOpen}
        editingProjectId={editingProjectId}
        setEditingProjectId={setEditingProjectId}
        editingProjectName={editingProjectName}
        setEditingProjectName={setEditingProjectName}
        projectName={projectName}
        setProjectName={setProjectName}
        handleCreateProject={handleCreateProject}
        onProjectUpdate={onProjectUpdate}
        
        isFileDialogOpen={isFileDialogOpen}
        setIsFileDialogOpen={setIsFileDialogOpen}
        sidebarView={sidebarView}
        fileName={fileName}
        setFileName={setFileName}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        allProjects={allProjects}
        handleCreateFile={handleCreateFile}
        
        isEditFileDialogOpen={isEditFileDialogOpen}
        setIsEditFileDialogOpen={setIsEditFileDialogOpen}
        editingFile={editingFile}
        setEditingFile={setEditingFile}
        handleUpdateFile={handleUpdateFile}
        
        isDeleteConfirmOpen={isDeleteConfirmOpen}
        setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
        handleDeleteConfirm={handleDeleteConfirm}
        
        isProjectDeleteConfirmOpen={isProjectDeleteConfirmOpen}
        setIsProjectDeleteConfirmOpen={setIsProjectDeleteConfirmOpen}
        deletingProject={deletingProject}
        setDeletingProject={setDeletingProject}
        onProjectDelete={onProjectDelete}
      />
    </>
  )
}
