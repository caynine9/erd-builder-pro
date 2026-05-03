import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogBody,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogMedia,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface DeleteEntityAlertProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEntity: any | null;
  deleteEntity: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
}

export const DeleteEntityAlert: React.FC<DeleteEntityAlertProps> = ({
  isOpen,
  onOpenChange,
  selectedEntity,
  deleteEntity,
  setSelectedNodeId,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm" className="max-w-[400px]">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Table</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogBody>
          <AlertDialogDescription>
            Are you sure you want to delete the table <strong>{selectedEntity?.name}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogBody>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              if (selectedEntity) {
                deleteEntity(selectedEntity.id);
                setSelectedNodeId(null);
                onOpenChange(false);
              }
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
