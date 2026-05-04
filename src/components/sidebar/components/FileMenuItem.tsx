import * as React from "react"
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenuAction,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { TruncatedTooltip } from "./TruncatedTooltip"

interface FileMenuItemProps {
  item: {
    id: number | string
    name?: string
    title?: string
    project_id?: number | string | null
  }
  type: 'erd' | 'notes' | 'drawings' | 'flowchart'
  icon?: any
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
    <SidebarMenuSubItem className={cn(!isOnline && "opacity-50 cursor-not-allowed")}>
      <SidebarMenuSubButton 
        isActive={isActive}
        onClick={() => isOnline && onSelect(item.id)}
        className={cn("cursor-pointer", !isOnline && "pointer-events-none")}
      >
        {Icon && <Icon className="size-4" />}
        <TruncatedTooltip content={displayName} sideOffset={5}>
          <span className={cn("flex-1 truncate", !Icon && "font-normal")}>{displayName}</span>
        </TruncatedTooltip>
      </SidebarMenuSubButton>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <SidebarMenuAction 
            showOnHover={false} 
            className={cn("cursor-pointer", !isOnline && "pointer-events-none")}
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
    </SidebarMenuSubItem>
  )
}
