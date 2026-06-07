import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useManufacturingStore } from '@/stores/useManufacturingStore';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';

interface AddStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddStationDialog = ({ open, onOpenChange }: AddStationDialogProps) => {
  const { stations, stationNodes, addStationNode } = useManufacturingStore();

  const handleAddStation = (stationId: string) => {
    // Position new stations in a cascade pattern
    const baseX = 300;
    const baseY = 200;
    const offset = stationNodes.length * 50;
    
    addStationNode(stationId, { 
      x: baseX + offset, 
      y: baseY + (offset % 150) 
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Add Station
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-4">
            {stations.map(station => {
              const isAdded = stationNodes.some(node => node.stationId === station.id);
              
              return (
                <div
                  key={station.id}
                  className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox checked={isAdded} disabled />
                    <div>
                      <p className="font-medium text-foreground">{station.name}</p>
                      <p className="text-sm text-muted-foreground">
                        R{station.wagePerHour}/hr
                      </p>
                    </div>
                  </div>
                  
                  {!isAdded && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleAddStation(station.id);
                        onOpenChange(false);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
