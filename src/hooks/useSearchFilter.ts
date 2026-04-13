import { useState, useMemo, useCallback } from "react";

interface SearchFilters {
  name: string;
  description: string;
}

interface UseSearchFilterOptions<T> {
  items: T[];
  getSearchableFields: (item: T) => { name: string; description: string | null };
  storageKey?: string;
}

interface UseSearchFilterReturn<T> {
  filters: SearchFilters;
  setNameFilter: (value: string) => void;
  setDescriptionFilter: (value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  isVisible: boolean;
  toggleVisibility: () => void;
  filteredItems: T[];
}

export function useSearchFilter<T>({
  items,
  getSearchableFields,
  storageKey,
}: UseSearchFilterOptions<T>): UseSearchFilterReturn<T> {
  const [isVisible, setIsVisible] = useState(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`kioku-search-visible-${storageKey}`);
        return saved === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const [filters, setFilters] = useState<SearchFilters>({
    name: "",
    description: "",
  });

  const setNameFilter = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, name: value }));
  }, []);

  const setDescriptionFilter = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, description: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ name: "", description: "" });
  }, []);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => {
      const newValue = !prev;
      if (storageKey) {
        try {
          localStorage.setItem(`kioku-search-visible-${storageKey}`, String(newValue));
        } catch {
          // Ignore storage errors
        }
      }
      return newValue;
    });
  }, [storageKey]);

  const hasActiveFilters = filters.name.trim() !== "" || filters.description.trim() !== "";

  const filteredItems = useMemo(() => {
    if (!hasActiveFilters) return items;

    const nameLower = filters.name.toLowerCase().trim();
    const descLower = filters.description.toLowerCase().trim();

    return items.filter((item) => {
      const fields = getSearchableFields(item);

      const nameMatches = !nameLower || fields.name.toLowerCase().includes(nameLower);
      const descMatches = !descLower || (fields.description?.toLowerCase().includes(descLower) ?? false);

      return nameMatches && descMatches;
    });
  }, [items, filters, hasActiveFilters, getSearchableFields]);

  return {
    filters,
    setNameFilter,
    setDescriptionFilter,
    clearFilters,
    hasActiveFilters,
    isVisible,
    toggleVisibility,
    filteredItems,
  };
}
