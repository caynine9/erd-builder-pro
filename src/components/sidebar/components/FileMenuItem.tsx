import * as React from "react"
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import { Project } from "../../../types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

interface FileMenuItemProps {
  item: {
    id: number | string
    name?: string
    title?: string
    project_id?: number | string | null
  }
  type: 'erd' | 'notes' | 'drawings' | 'flowchart'
  icon: any
  isActive: boolean
  isOnline: boolean
  onSelect: (id: number | string) => void
  setEditingFile: (file: any) => void
  setSelectedProjectId: (id: string) => void
  setIsEditFileDialogOpen: (open: boolean) => void
  setDeletingFile: (file: any) => void
  setIsDeleteConfirmOpen: (open: boolean) => void
}

export function FileMenuItem({
  item,
  type,
  icon: Icon,
  isActive,
  isOnline,
  onSelect,
  setEditingFile,
  setSelectedProjectId,
  setIsEditFileDialogOpen,
  setDeletingFile,
  setIsDeleteConfirmOpen
}: FileMenuItemProps) {
  const displayName = item.name || item.title || "Untitled"

  return (
    <SidebarMenuItem className={cn(!isOnline && "opacity-50 cursor-not-allowed")}>
      <SidebarMenuButton 
        isActive={isActive}
        onClick={() => isOnline && onSelect(item.id)}
        className={cn("cursor-pointer", !isOnline && "pointer-events-none")}
      >
        <Icon className="size-4" />
        <div className="flex-1 min-w-0 flex items-center gap-2 pr-1">
          <Tooltip>
            <TooltipTrigger render={<span className="flex-1 min-w-0 truncate">{displayName}</span>} />
            <TooltipContent side="right" sideOffset={5}>{displayName}</TooltipContent>
          </Tooltip>
        </div>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <SidebarMenuAction 
            showOnHover={false} 
            className={cn("cursor-pointer opacity-100", !isOnline && "pointer-events-none")}
          >
            <MoreHorizontal />
          </SidebarMenuAction>
        }>
          <span className="sr-only">More</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-40">
          <DropdownMenuItem disabled={!isOnline} onClick={() => {
            setEditingFile({ id: item.id, name: displayName, projectId: item.project_id, type })
            setSelectedProjectId(item.project_id?.toString() || "none")
            setIsEditFileDialogOpen(true)
          }}>
            <Edit2 className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!isOnline} className="text-destructive focus:text-destructive" onClick={() => {
            setDeletingFile({ id: item.id, type })
            setIsDeleteConfirmOpen(true)
          }}>
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
