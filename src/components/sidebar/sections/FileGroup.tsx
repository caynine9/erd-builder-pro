import * as React from "react"
import { Plus, MoreHorizontal, Database, StickyNote, PenTool, Network } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { FileMenuItem } from "../components/FileMenuItem"
import { Diagram, Note, Drawing, Flowchart } from "../../../types"

interface FileGroupProps {
  sidebarView: 'erd' | 'notes' | 'drawings' | 'flowchart' | 'changelog'
  view: string
  isOnline: boolean
  isLoading: boolean
  hasMore: boolean
  searchQuery: string
  files: (Diagram | Note | Drawing | Flowchart)[]
  activeFileId: number | string | null
  onFileSelect: (id: number | string) => void
  onAddClick: () => void
  onLoadMore: () => void
  setEditingFile: (file: any) => void
  setSelectedProjectId: (id: string) => void
  setIsEditFileDialogOpen: (open: boolean) => void
  setDeletingFile: (file: any) => void
  setIsDeleteConfirmOpen: (open: boolean) => void
}

export function FileGroup({
  sidebarView,
  view,
  isOnline,
  isLoading,
  hasMore,
  searchQuery,
  files,
  activeFileId,
  onFileSelect,
  onAddClick,
  onLoadMore,
  setEditingFile,
  setSelectedProjectId,
  setIsEditFileDialogOpen,
  setDeletingFile,
  setIsDeleteConfirmOpen
}: FileGroupProps) {
  const getIcon = () => {
    switch (sidebarView) {
      case 'erd': return Database
      case 'notes': return StickyNote
      case 'drawings': return PenTool
      case 'flowchart': return Network
      default: return Database
    }
  }

  const getLabel = () => {
    switch (sidebarView) {
      case 'erd': return 'Diagrams'
      case 'notes': return 'Notes'
      case 'flowchart': return 'Flowcharts'
      case 'drawings': return 'Drawings'
      default: return 'Files'
    }
  }

  const shared = files.filter(f => f.is_public)
  const privateItems = files.filter(f => !f.is_public)
  const Icon = getIcon()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden pt-0">
      <SidebarGroupLabel>{getLabel()}</SidebarGroupLabel>
      {!isOnline ? null : (
        <SidebarGroupAction title={`Add ${sidebarView}`} onClick={onAddClick} className="cursor-pointer">
          <Plus />
        </SidebarGroupAction>
      )}
      <SidebarMenu>
        {isLoading && (
          <div className="space-y-2 px-2 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (
          <>
            {/* Shared Section */}
            <div className="px-2 pt-4 pb-1 text-[10px] uppercase font-semibold text-muted-foreground/70 tracking-wider">Shared</div>
            {shared.length > 0 ? shared.map(file => (
              <FileMenuItem 
                key={file.id}
                item={file}
                type={sidebarView as any}
                icon={Icon}
                isActive={activeFileId === file.id && view === sidebarView}
                isOnline={isOnline}
                onSelect={onFileSelect}
                setEditingFile={setEditingFile}
                setSelectedProjectId={setSelectedProjectId}
                setIsEditFileDialogOpen={setIsEditFileDialogOpen}
                setDeletingFile={setDeletingFile}
                setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
              />
            )) : (
              <div className="px-5 py-2 text-[11px] text-muted-foreground/50 italic">No shared items found</div>
            )}

            {/* Private Section */}
            {privateItems.length > 0 && (
              <>
                <div className="px-2 pt-4 pb-1 text-[10px] uppercase font-semibold text-muted-foreground/70 tracking-wider">Private</div>
                {privateItems.map(file => (
                  <FileMenuItem 
                    key={file.id}
                    item={file}
                    type={sidebarView as any}
                    icon={Icon}
                    isActive={activeFileId === file.id && view === sidebarView}
                    isOnline={isOnline}
                    onSelect={onFileSelect}
                    setEditingFile={setEditingFile}
                    setSelectedProjectId={setSelectedProjectId}
                    setIsEditFileDialogOpen={setIsEditFileDialogOpen}
                    setDeletingFile={setDeletingFile}
                    setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
                  />
                ))}
              </>
            )}
          </>
        )}

        {hasMore && (
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={onLoadMore}
            >
              <MoreHorizontal className="size-4" />
              <span>More</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {searchQuery && files.length === 0 && (
          <div className="px-4 py-2 text-xs text-muted-foreground italic">No results match "{searchQuery}"</div>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
