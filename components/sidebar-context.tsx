"use client";

import { createContext, useContext } from "react";

interface SidebarCtx {
  setLocked: (v: boolean) => void;
  setHovered: (v: boolean) => void;
}

export const SidebarContext = createContext<SidebarCtx>({
  setLocked: () => {},
  setHovered: () => {},
});

export const useSidebar = () => useContext(SidebarContext);
