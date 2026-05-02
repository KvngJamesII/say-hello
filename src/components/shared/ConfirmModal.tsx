import React from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmModalProps {
  /** Optional — if omitted, the modal is treated as always open (controlled by parent rendering). */
  isOpen?: boolean;
  onClose?: () => void;
  /** Alternate close handler used by some legacy callers. */
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'destructive';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'default',
  isLoading = false,
}) => {
  const handleClose = () => {
    onClose?.();
    onCancel?.();
  };
  // If neither isOpen nor isOpen=false is provided, treat as open
  const open = isOpen === undefined ? true : isOpen;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[440px] bg-[--bg-elevated] border-[--border] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-[--text-secondary] pt-2 leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="bg-transparent border-[--border] text-[--text-secondary] hover:bg-white/[0.04] hover:text-white"
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
            className={
              confirmVariant === 'destructive'
                ? 'bg-[--danger] hover:bg-[--danger]/90 text-white'
                : 'text-white'
            }
            style={confirmVariant === 'default' ? { background: 'var(--accent-primary)' } : {}}
          >
            {isLoading ? 'Processing…' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
