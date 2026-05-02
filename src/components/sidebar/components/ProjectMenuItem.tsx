import * as React from "react"
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import { Project } from "../../../types"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface ProjectMenuItemProps {
  item: {
    id: number | string
    name: string
    icon: any
    isActive: boolean
    diagrams_count?: number
    notes_count?: number
    drawings_count?: number
    flowcharts_count?: number
    files_count?: number
  }
  isOnline: boolean
  isMobile: boolean
  sidebarView: string
  onProjectSelect: (id: number | string) => void
  setEditingProjectId: (id: number | string) => void
  setEditingProjectName: (name: string) => void
  setIsProjectDialogOpen: (open: boolean) => void
  setDeletingProject: (project: { id: number | string, name: string }) => void
  setIsProjectDeleteConfirmOpen: (open: boolean) => void
  getFileCount: (id: number | string) => number
}

export function ProjectMenuItem({
  item,
  isOnline,
  isMobile,
  sidebarView,
  onProjectSelect,
  setEditingProjectId,
  setEditingProjectName,
  setIsProjectDialogOpen,
  setDeletingProject,
  setIsProjectDeleteConfirmOpen,
  getFileCount
}: ProjectMenuItemProps) {
  return (
    <SidebarMenuItem className={cn(!isOnline && "opacity-50 cursor-not-allowed")}>
      <SidebarMenuButton 
        onClick={() => isOnline && onProjectSelect(item.id)} 
        isActive={item.isActive} 
        className={cn("cursor-pointer", !isOnline && "pointer-events-none")}
      >
        <item.icon />
        <Tooltip>
          <TooltipTrigger render={<span className="flex-1 min-w-0 truncate">{item.name}</span>} />
          <TooltipContent side="right" sideOffset={10}>
            {item.name}
          </TooltipContent>
        </Tooltip>
        <Badge className="ml-auto bg-green-50 text-green-700 hover:bg-green-50 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-950 border-none px-1.5 h-4.5 text-[10px] font-bold">
          {(() => {
            if (item.diagrams_count !== undefined) {
              if (sidebarView === 'erd') return item.diagrams_count;
              if (sidebarView === 'notes') return item.notes_count || 0;
              if (sidebarView === 'drawings') return item.drawings_count || 0;
              if (sidebarView === 'flowchart') return item.flowcharts_count || 0;
              return item.files_count || 0;
            }
            return getFileCount(item.id);
          })()}
        </Badge>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <SidebarMenuAction 
            showOnHover={false} 
            className={cn(
              "cursor-pointer opacity-100", 
              !isOnline && "pointer-events-none"
            )}
          >
            <MoreHorizontal />
          </SidebarMenuAction>
        }>
          <span className="sr-only">More</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-48 rounded-lg"
          side={isMobile ? "bottom" : "right"}
          align={isMobile ? "end" : "start"}
        >
          <DropdownMenuItem disabled={!isOnline} onClick={() => {
            setEditingProjectId(item.id)
            setEditingProjectName(item.name)
            setIsProjectDialogOpen(true)
          }}>
            <Edit2 className="mr-2 size-4 text-muted-foreground" />
            <span>Rename Project</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            disabled={!isOnline} 
            className="text-destructive focus:text-destructive" 
            onClick={() => {
              setDeletingProject({ id: item.id, name: item.name })
              setIsProjectDeleteConfirmOpen(true)
            }}
          >
            <Trash2 className="mr-2 size-4" />
            <span>Delete Project</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
