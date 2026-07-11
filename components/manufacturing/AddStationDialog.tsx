"use client";

import { useManufacturingStore } from "@/stores/useManufacturingStore";
import { X, Plus, CheckCircle2 } from "lucide-react";

interface AddStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddStationDialog = ({ open, onOpenChange }: AddStationDialogProps) => {
  const { stations, stationNodes, addStationNode } = useManufacturingStore();

  if (!open) return null;

  /* Smart horizontal positioning: place each new station to the right of the last */
  const getNextPosition = () => {
    if (stationNodes.length === 0) return { x: 280, y: 220 };
    const rightmost = stationNodes.reduce(
      (max, n) => (n.position.x > max.x ? n.position : max),
      { x: 0, y: 220 }
    );
    return { x: rightmost.x + 280, y: rightmost.y };
  };

  const handleAdd = (stationId: string) => {
    addStationNode(stationId, getNextPosition());
    onOpenChange(false);
  };

  const close = () => onOpenChange(false);

  return (
    /* Backdrop */
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.32)",
        backdropFilter: "blur(2px)",
      }}
      onClick={close}
    >
      <div
        style={{
          width: "min(400px, calc(100vw - 32px))",
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          boxShadow: "0 16px 48px rgba(0,0,0,0.16)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 20px 14px",
          borderBottom: "1px solid #F5F5F7",
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>Add Station</h2>
            <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>
              Select a station to place on the canvas
            </p>
          </div>
          <button
            onClick={close}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8E93", display: "flex", padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Station list */}
        <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
          {stations.length === 0 && (
            <p style={{ fontSize: 13, color: "#8E8E93", textAlign: "center", padding: "20px 0" }}>
              No stations defined yet. Add them in the Stations module first.
            </p>
          )}
          {stations.map((station) => {
            const isAdded = stationNodes.some((n) => n.stationId === station.id);
            return (
              <div
                key={station.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px",
                  backgroundColor: isAdded ? "#F5F5F7" : "#FFFFFF",
                  border: `1px solid ${isAdded ? "#E5E5EA" : "#E5E5EA"}`,
                  borderRadius: 10,
                  opacity: isAdded ? 0.6 : 1,
                }}
              >
                {/* Station info */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{station.name}</p>
                  <p style={{ fontSize: 11, color: "#8E8E93", marginTop: 2 }}>
                    R{station.wagePerHour}/hr base rate
                  </p>
                </div>

                {isAdded ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#34C759", fontSize: 12, fontWeight: 600 }}>
                    <CheckCircle2 size={15} />
                    Added
                  </div>
                ) : (
                  <button
                    onClick={() => handleAdd(station.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "6px 14px", height: 32,
                      backgroundColor: "#F56300", color: "#fff",
                      border: "none", borderRadius: 8,
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    <Plus size={13} /> Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
