import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';

interface SaveProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}

export const SaveProcessDialog = ({ open, onOpenChange, onSave }: SaveProcessDialogProps) => {
  const [processName, setProcessName] = useState('');

  const handleSave = () => {
    if (processName.trim()) {
      onSave(processName);
      setProcessName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Save Production Process
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="process-name" className="text-foreground">
              Process Name
            </Label>
            <Input
              id="process-name"
              placeholder="Enter process name..."
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              className="bg-input border-border text-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!processName.trim()}>
            <Save className="w-4 h-4 mr-2" />
            Save Process
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
