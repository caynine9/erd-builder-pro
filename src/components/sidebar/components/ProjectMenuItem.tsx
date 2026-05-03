import * as React from "react"
import { MoreHorizontal, Edit2, Trash2, ChevronRight } from "lucide-react"
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { FileMenuItem } from "./FileMenuItem"
import { TruncatedTooltip } from "./TruncatedTooltip"

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
  view: string
  onProjectSelect: (id: number | string | null) => void
  setEditingProjectId: (id: number | string) => void
  setEditingProjectName: (name: string) => void
  setIsProjectDialogOpen: (open: boolean) => void
  setDeletingProject: (project: { id: number | string, name: string }) => void
  setIsProjectDeleteConfirmOpen: (open: boolean) => void
  getFileCount: (id: number | string | null) => number

  // File Props
  files: any[]
  activeFileId: number | string | null
  onFileSelect: (id: number | string) => void
  fileIcon: any
  setEditingFile: (file: any) => void
  setSelectedProjectId: (id: string) => void
  setIsEditFileDialogOpen: (open: boolean) => void
  setDeletingFile: (file: any) => void
  setIsDeleteConfirmOpen: (open: boolean) => void
  isUncategorized?: boolean
}

export function ProjectMenuItem({
  item,
  isOnline,
  isMobile,
  sidebarView,
  view,
  onProjectSelect,
  setEditingProjectId,
  setEditingProjectName,
  setIsProjectDialogOpen,
  setDeletingProject,
  setIsProjectDeleteConfirmOpen,
  getFileCount,

  files,
  activeFileId,
  onFileSelect,
  fileIcon: FileIcon,
  setEditingFile,
  setSelectedProjectId,
  setIsEditFileDialogOpen,
  setDeletingFile,
  setIsDeleteConfirmOpen,
  isUncategorized
}: ProjectMenuItemProps) {
  const [isOpen, setIsOpen] = React.useState(item.isActive)

  // Sync open state with active project
  React.useEffect(() => {
    if (item.isActive) setIsOpen(true)
  }, [item.isActive])

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem className={cn(!isOnline && "opacity-50 cursor-not-allowed")}>
        <CollapsibleTrigger 
          render={
            <SidebarMenuButton 
              onClick={() => isOnline && onProjectSelect(item.id)} 
              isActive={item.isActive} 
              className={cn("cursor-pointer", !isOnline && "pointer-events-none")}
            >
              <ChevronRight className={cn(
                "size-4 transition-transform duration-200",
                isOpen && "rotate-90"
              )} />
              <item.icon className="size-4" />
              <TruncatedTooltip content={item.name}>
                <span className="flex-1 min-w-0 truncate font-medium">{item.name}</span>
              </TruncatedTooltip>
            </SidebarMenuButton>
          }
        />
        
        {!isUncategorized && (
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <SidebarMenuAction 
                showOnHover={false} 
                className={cn(
                  "cursor-pointer opacity-100 mr-1", 
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
        )}

        <CollapsibleContent>
          <div className="ml-3.5 pl-3.5 border-l border-border/50 space-y-0.5 mt-0.5 mb-1">
            {files.map(file => (
              <FileMenuItem 
                key={file.id}
                item={file}
                type={sidebarView as any}
                icon={FileIcon}
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
          </div>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}
