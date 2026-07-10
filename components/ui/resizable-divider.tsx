"use client";

import { useCallback, useRef, useState } from "react";

export function ResizableDivider({
  onDrag,
  variant = "default",
}: {
  onDrag: (delta: number) => void;
  variant?: "default" | "dark";
}) {
  const [active,  setActive]  = useState(false);
  const [hovered, setHovered] = useState(false);
  const lastX = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    lastX.current = e.clientX;
    setActive(true);

    const move = (ev: MouseEvent) => {
      const dx = ev.clientX - lastX.current;
      lastX.current = ev.clientX;
      onDrag(dx);
    };
    const up = () => {
      setActive(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, [onDrag]);

  const lit = active || hovered;
  const lineColor =
    variant === "dark"
      ? lit ? "#F56300" : "#2a2a2a"
      : lit ? "var(--accent)" : "var(--border)";

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 8,
        flexShrink: 0,
        cursor: "col-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
      }}
    >
      <div style={{
        width: 2,
        height: "100%",
        borderRadius: 1,
        backgroundColor: lineColor,
        transition: "background-color 0.12s",
      }} />
    </div>
  );
}
