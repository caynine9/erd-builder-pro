import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DuplicateDocumentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  view: string;
  duplicateName: string;
  setDuplicateName: (name: string) => void;
  executeDuplicate: () => void;
  isRefreshing: boolean;
}

export const DuplicateDocumentDialog: React.FC<DuplicateDocumentDialogProps> = ({
  isOpen,
  onOpenChange,
  view,
  duplicateName,
  setDuplicateName,
  executeDuplicate,
  isRefreshing,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Duplicate Document</DialogTitle>
          <DialogDescription>
            Create a copy of this {view === 'erd' ? 'diagram' : view === 'notes' ? 'note' : view === 'drawings' ? 'drawing' : 'flowchart'}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="duplicate-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                New Name
              </label>
              <input
                id="duplicate-input"
                type="text"
                className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && duplicateName.trim()) {
                    executeDuplicate();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={executeDuplicate}
            disabled={!duplicateName.trim() || isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Duplicating...
              </>
            ) : "Duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
