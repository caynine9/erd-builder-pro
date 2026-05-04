import * as React from "react"
import { Folder, Plus, MoreHorizontal, Sparkles, FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Project } from "../../../types"
import { Skeleton } from "@/components/ui/skeleton"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ProjectMenuItem } from "../components/ProjectMenuItem"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarGroupContent } from "@/components/ui/sidebar"

interface SidebarProject extends Project {
  url: string
  icon: any
  isActive: boolean
}

interface ProjectGroupProps {
  projects: SidebarProject[]
  activeProjectId: number | string | null
  isOnline: boolean
  isProjectsLoading: boolean
  hasMoreProjects: boolean
  sidebarView: string
  view: string
  isMobile: boolean
  onProjectSelect: (id: number | string | null) => void
  onProjectCreateClick: () => void
  onLoadMoreProjects?: () => void
  setEditingProjectId: (id: number | string) => void
  setEditingProjectName: (name: string) => void
  setIsProjectDialogOpen: (open: boolean) => void
  setDeletingProject: (project: any) => void
  setIsProjectDeleteConfirmOpen: (open: boolean) => void
  getFileCount: (id: number | string | null, viewFilter?: string) => number

  // Tree View Props
  files: any[]
  activeFileId: number | string | null
  onFileSelect: (id: number | string) => void
  fileIcon: any
  setEditingFile: (file: any) => void
  setSelectedProjectId: (id: string) => void
  setIsEditFileDialogOpen: (open: boolean) => void
  setDeletingFile: (file: any) => void
  setIsDeleteConfirmOpen: (open: boolean) => void
  onAddClick: () => void
  hasMoreFiles: boolean
  onLoadMoreFiles: () => void
  isFilesLoading: boolean
  searchQuery: string
  onNoteImportMarkdown?: (projectId: number | string | null) => void
}

export function ProjectGroup({
  projects,
  activeProjectId,
  isOnline,
  isProjectsLoading,
  hasMoreProjects,
  sidebarView,
  view,
  isMobile,
  onProjectSelect,
  onProjectCreateClick,
  onLoadMoreProjects,
  setEditingProjectId,
  setEditingProjectName,
  setIsProjectDialogOpen,
  setDeletingProject,
  setIsProjectDeleteConfirmOpen,
  getFileCount,

  files,
  activeFileId,
  onFileSelect,
  fileIcon,
  setEditingFile,
  setSelectedProjectId,
  setIsEditFileDialogOpen,
  setDeletingFile,
  setIsDeleteConfirmOpen,
  onAddClick,
  hasMoreFiles,
  onLoadMoreFiles,
  isFilesLoading,
  searchQuery,
  onNoteImportMarkdown
}: ProjectGroupProps) {
  const uncategorizedFiles = files.filter(f => !f.project_id);

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupContent className="px-2 pb-4">
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <SidebarMenuButton
              disabled={!isOnline}
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground group-data-[state=open]:bg-primary/90"
            >
              <div className="flex items-center justify-center rounded-full bg-primary-foreground text-primary mr-2 shrink-0">
                <Plus strokeWidth={3} />
              </div>
              <span>Quick Create</span>
            </SidebarMenuButton>
          } />
          <DropdownMenuContent className="w-56" align="start" side="bottom" sideOffset={8}>
            <DropdownMenuItem onClick={onProjectCreateClick} className="cursor-pointer py-2">
              <Folder className="mr-2 size-4 text-muted-foreground" />
              <span className="font-medium">Create Workspace</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddClick} className="cursor-pointer py-2">
              <Plus className="mr-2 size-4 text-muted-foreground" />
              <span className="font-medium">Create File</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarGroupContent>

      <SidebarGroupLabel className="px-2">Workspaces</SidebarGroupLabel>
      <SidebarMenu>
        {isProjectsLoading && projects.length === 0 && (
          <div className="space-y-2 px-2 py-2">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        )}

        {projects.map((item) => (
          <ProjectMenuItem 
            key={item.id}
            item={item}
            isOnline={isOnline}
            isMobile={isMobile}
            sidebarView={sidebarView}
            view={view}
            onProjectSelect={onProjectSelect}
            setEditingProjectId={setEditingProjectId}
            setEditingProjectName={setEditingProjectName}
            setIsProjectDialogOpen={setIsProjectDialogOpen}
            setDeletingProject={setDeletingProject}
            setIsProjectDeleteConfirmOpen={setIsProjectDeleteConfirmOpen}
            getFileCount={getFileCount}
            
            // Files for this project
            files={files.filter(f => String(f.project_id) === String(item.id))}
            activeFileId={activeFileId}
            onFileSelect={onFileSelect}
            fileIcon={fileIcon}
            setEditingFile={setEditingFile}
            setSelectedProjectId={setSelectedProjectId}
            setIsEditFileDialogOpen={setIsEditFileDialogOpen}
            setDeletingFile={setDeletingFile}
            setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
            onNoteImportMarkdown={onNoteImportMarkdown}
          />
        ))}

        {/* Uncategorized Section */}
        {(uncategorizedFiles.length > 0 || activeProjectId === "none") && (
          <ProjectMenuItem 
            item={{
              id: "uncategorized",
              name: "Uncategorized",
              icon: Folder,
              isActive: activeProjectId === "none",
            }}
            isOnline={isOnline}
            isMobile={isMobile}
            sidebarView={sidebarView}
            view={view}
            onProjectSelect={onProjectSelect}
            setEditingProjectId={() => {}}
            setEditingProjectName={() => {}}
            setIsProjectDialogOpen={() => {}}
            setDeletingProject={() => {}}
            setIsProjectDeleteConfirmOpen={() => {}}
            getFileCount={() => uncategorizedFiles.length}
            
            files={uncategorizedFiles}
            activeFileId={activeFileId}
            onFileSelect={onFileSelect}
            fileIcon={fileIcon}
            setEditingFile={setEditingFile}
            setSelectedProjectId={setSelectedProjectId}
            setIsEditFileDialogOpen={setIsEditFileDialogOpen}
            setDeletingFile={setDeletingFile}
            setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
            onNoteImportMarkdown={onNoteImportMarkdown}
            isUncategorized={true}
          />
        )}
        
        {hasMoreProjects && (
          <SidebarMenuItem className={cn(!isOnline && "opacity-50 cursor-not-allowed")}>
            <SidebarMenuButton 
              className={cn("text-muted-foreground hover:text-foreground", !isOnline && "pointer-events-none")}
              onClick={() => isOnline && onLoadMoreProjects?.()}
            >
              <MoreHorizontal className="size-4" />
              <span>More Projects</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
