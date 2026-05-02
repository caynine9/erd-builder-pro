import * as React from "react"
import { Folder, Plus, MoreHorizontal } from "lucide-react"
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
}

export function ProjectGroup({
  projects,
  activeProjectId,
  isOnline,
  isProjectsLoading,
  hasMoreProjects,
  sidebarView,
  isMobile,
  onProjectSelect,
  onProjectCreateClick,
  onLoadMoreProjects,
  setEditingProjectId,
  setEditingProjectName,
  setIsProjectDialogOpen,
  setDeletingProject,
  setIsProjectDeleteConfirmOpen,
  getFileCount
}: ProjectGroupProps) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      {!isOnline ? null : (
        <SidebarGroupAction title="Add Project" onClick={onProjectCreateClick} className="cursor-pointer">
          <Plus />
          <span className="sr-only">Add Project</span>
        </SidebarGroupAction>
      )}
      <SidebarMenu>
        <SidebarMenuItem className={cn(!isOnline && "opacity-50 cursor-not-allowed")}>
          <SidebarMenuButton 
            isActive={activeProjectId === null}
            onClick={() => isOnline && onProjectSelect(null)}
            className={cn("cursor-pointer", !isOnline && "pointer-events-none")}
          >
            <Folder />
            <span>All Project</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        
        {isProjectsLoading && (
          <div className="space-y-2 px-2 py-2">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        )}

        {!isProjectsLoading && projects.map((item) => (
          <ProjectMenuItem 
            key={item.id}
            item={item}
            isOnline={isOnline}
            isMobile={isMobile}
            sidebarView={sidebarView}
            onProjectSelect={onProjectSelect}
            setEditingProjectId={setEditingProjectId}
            setEditingProjectName={setEditingProjectName}
            setIsProjectDialogOpen={setIsProjectDialogOpen}
            setDeletingProject={setDeletingProject}
            setIsProjectDeleteConfirmOpen={setIsProjectDeleteConfirmOpen}
            getFileCount={getFileCount}
          />
        ))}
        
        {hasMoreProjects && (
          <SidebarMenuItem className={cn(!isOnline && "opacity-50 cursor-not-allowed")}>
            <SidebarMenuButton 
              className={cn("text-muted-foreground hover:text-foreground", !isOnline && "pointer-events-none")}
              onClick={() => isOnline && onLoadMoreProjects?.()}
            >
              <MoreHorizontal className="size-4" />
              <span>More</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
