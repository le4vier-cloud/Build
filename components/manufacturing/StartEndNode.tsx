import { Handle, Position } from '@xyflow/react';
import { Play, Flag } from 'lucide-react';

interface StartEndNodeProps {
  data: {
    label: string;
    type: 'start' | 'end';
  };
}

export const StartEndNode = ({ data }: StartEndNodeProps) => {
  return (
    <>
      {data.type === 'start' && (
        <Handle type="source" position={Position.Right} className="!bg-primary" />
      )}
      
      <div className="px-6 py-4 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] font-semibold flex items-center gap-2">
        {data.type === 'start' ? (
          <Play className="w-4 h-4" fill="currentColor" />
        ) : (
          <Flag className="w-4 h-4" />
        )}
        {data.label}
      </div>

      {data.type === 'end' && (
        <Handle type="target" position={Position.Left} className="!bg-primary" />
      )}
    </>
  );
};
