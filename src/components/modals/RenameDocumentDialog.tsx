import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface RenameDocumentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  view: string;
  activeDocument: any | null;
  newName: string;
  setNewName: (name: string) => void;
  updateDiagram: (id: string | number, name: string) => void;
  updateNote: (id: string | number, name: string) => void;
  updateDrawing: (id: string | number, name: string) => void;
  updateFlowchart: (id: string | number, name: string) => void;
}

export const RenameDocumentDialog: React.FC<RenameDocumentDialogProps> = ({
  isOpen,
  onOpenChange,
  view,
  activeDocument,
  newName,
  setNewName,
  updateDiagram,
  updateNote,
  updateDrawing,
  updateFlowchart,
}) => {
  const handleSave = () => {
    const id = activeDocument?.id;
    if (id && newName.trim()) {
      if (view === 'erd') updateDiagram(id, newName);
      else if (view === 'notes') updateNote(id, newName);
      else if (view === 'drawings') updateDrawing(id, newName);
      else if (view === 'flowchart') updateFlowchart(id, newName);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename Document</DialogTitle>
          <DialogDescription>
            Enter a new name for your {view === 'erd' ? 'diagram' : view === 'notes' ? 'note' : view === 'drawings' ? 'drawing' : 'flowchart'}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="rename-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                New Name
              </label>
              <input
                id="rename-input"
                type="text"
                className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) {
                    handleSave();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="h-9" />}>
            Cancel
          </DialogClose>
          <Button 
            disabled={!newName.trim() || newName === (activeDocument?.title || activeDocument?.name)}
            onClick={handleSave}
            className="h-9 px-6"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
