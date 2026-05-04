import * as React from "react"
import { MoreHorizontal, Edit2, Trash2, ChevronRight, FileUp } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
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
  onNoteImportMarkdown?: (projectId: number | string | null) => void
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
  onNoteImportMarkdown,
  isUncategorized
}: ProjectMenuItemProps) {
  const [isOpen, setIsOpen] = React.useState(item.isActive)
  const isManualToggle = React.useRef(false)

  // Sync open state with active project
  React.useEffect(() => {
    if (item.isActive && !isManualToggle.current) {
      setIsOpen(true)
    }
    // Reset the manual toggle flag after sync is evaluated
    isManualToggle.current = false
  }, [item.isActive])

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem className={cn("relative group/menu-item", !isOnline && "opacity-50 cursor-not-allowed")}>
        <SidebarMenuButton 
          onClick={() => {
            if (isOnline) {
              isManualToggle.current = true
              onProjectSelect(item.id)
              setIsOpen(!isOpen)
            }
          }} 
          isActive={item.isActive} 
          className={cn("group/btn cursor-pointer pr-8", !isOnline && "pointer-events-none")}
        >
          <ChevronRight className={cn(
            "size-4 transition-transform duration-200 text-muted-foreground",
            isOpen && "rotate-90"
          )} />
          <TruncatedTooltip content={item.name}>
            <span className="flex-1 min-w-0 truncate font-medium">{item.name}</span>
          </TruncatedTooltip>
        </SidebarMenuButton>

        {!isUncategorized && (
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <SidebarMenuAction 
                className={cn(
                  "cursor-pointer", 
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
                <span>Edit</span>
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
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {isUncategorized && (
          <SidebarMenuAction className="pointer-events-none opacity-0" />
        )}

        <CollapsibleContent>
          <SidebarMenuSub className="ml-3.5 mr-0 pl-2.5 pr-0">
            {files.map(file => (
              <FileMenuItem 
                key={file.id}
                item={file}
                type={sidebarView as any}
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
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}
