"use client";

import { useCallback, useMemo, useState } from "react";

export function useSelection<T extends string = string>() {
  const [selected, setSelected] = useState<Set<T>>(new Set());

  const toggle = useCallback((id: T) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectOnly = useCallback((id: T) => setSelected(new Set([id])), []);
  const clear = useCallback(() => setSelected(new Set()), []);
  const selectAll = useCallback((ids: T[]) => setSelected(new Set(ids)), []);
  const isSelected = useCallback((id: T) => selected.has(id), [selected]);

  const toggleAll = useCallback((ids: T[]) => {
    setSelected(prev => (prev.size === ids.length ? new Set() : new Set(ids)));
  }, []);

  return useMemo(() => ({
    selected,
    count: selected.size,
    toggle,
    selectOnly,
    clear,
    selectAll,
    toggleAll,
    isSelected,
  }), [selected, toggle, selectOnly, clear, selectAll, toggleAll, isSelected]);
}
