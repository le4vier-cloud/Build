import { motion } from 'framer-motion';
import { useManufacturingStore } from '@/stores/useManufacturingStore';
import { Clock, Zap, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const TimingDisplay = () => {
  const { getStageGroups, getTotalCost } = useManufacturingStore();
  const stageGroups = getStageGroups();

  const totalTime = stageGroups.reduce((sum, group) => sum + group.maxDuration, 0);
  const totalCost = getTotalCost();
  const criticalStations = stageGroups.map(g => g.criticalStationId).filter(Boolean);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex gap-4"
    >
      <Card className="px-6 py-4 bg-card border-border flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Production Time</p>
          <p className="text-2xl font-bold text-foreground">{totalTime} min</p>
        </div>
      </Card>

      <Card className="px-6 py-4 bg-card border-border flex items-center gap-4">
        <div className="p-3 rounded-full bg-critical/10">
          <Zap className="w-6 h-6 text-critical" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Critical Stations</p>
          <p className="text-2xl font-bold text-foreground">{criticalStations.length}</p>
        </div>
      </Card>

      <Card className="px-6 py-4 bg-card border-border flex items-center gap-4">
        <div className="p-3 rounded-full bg-secondary/20">
          <DollarSign className="w-6 h-6 text-secondary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold text-foreground">R{totalCost.toFixed(2)}</p>
        </div>
      </Card>
    </motion.div>
  );
};
