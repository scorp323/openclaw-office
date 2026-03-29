import { GripVertical, Star, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResponsive } from "@/hooks/useResponsive";

export interface Favorite {
  type: "page" | "agent" | "cron";
  id: string;
  label: string;
  path: string;
}

const FAVORITES_KEY = "mc_favorites";
const FAVORITES_CHANGED_EVENT = "mc_favorites_changed";

const DEFAULT_FAVORITES: Favorite[] = [
  { type: "page", id: "dashboard", label: "Dashboard", path: "/dashboard" },
  { type: "page", id: "briefing", label: "Briefing", path: "/briefing" },
  { type: "page", id: "office", label: "Office", path: "/office" },
];

function loadFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return JSON.parse(raw) as Favorite[];
  } catch {
    // ignore
  }
  // First visit: seed defaults
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(DEFAULT_FAVORITES));
  return DEFAULT_FAVORITES;
}

function persistFavorites(favs: Favorite[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

// ─── Exported hook for page headers ─────────────────────────────────────────

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>(loadFavorites);

  useEffect(() => {
    const handler = () => setFavorites(loadFavorites());
    window.addEventListener(FAVORITES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, handler);
  }, []);

  const addFavorite = useCallback((fav: Favorite) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.id === fav.id)) return prev;
      const next = [...prev, fav];
      persistFavorites(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.id !== id);
      persistFavorites(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback(
    (fav: Favorite) => {
      if (favorites.some((f) => f.id === fav.id)) {
        removeFavorite(fav.id);
      } else {
        addFavorite(fav);
      }
    },
    [favorites, addFavorite, removeFavorite],
  );

  const isFavorited = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites],
  );

  return { favorites, addFavorite, removeFavorite, toggleFavorite, isFavorited };
}

// ─── StarButton: drop-in for page headers ────────────────────────────────────

export function FavoriteStarButton({ id, label, path, type = "page" }: Omit<Favorite, "type"> & { type?: Favorite["type"] }) {
  const { isFavorited, toggleFavorite } = useFavorites();
  const favorited = isFavorited(id);

  return (
    <button
      type="button"
      onClick={() => toggleFavorite({ id, label, path, type })}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      className={`rounded p-1 transition-colors ${
        favorited
          ? "text-amber-400 hover:text-amber-500"
          : "text-gray-300 hover:text-amber-400 dark:text-gray-600 dark:hover:text-amber-400"
      }`}
    >
      <Star className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
    </button>
  );
}

// ─── FavoritesBar ─────────────────────────────────────────────────────────────

export function FavoritesBar() {
  const { isMobile } = useResponsive();
  const [favorites, setFavorites] = useState<Favorite[]>(loadFavorites);
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  // Drag-to-reorder state
  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  // Sync from storage events (other tabs or hook writes)
  useEffect(() => {
    const handler = () => setFavorites(loadFavorites());
    window.addEventListener(FAVORITES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, handler);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.id !== id);
      persistFavorites(next);
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  }, []);

  const handleDragStart = useCallback((id: string) => {
    dragId.current = id;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragOverId.current = id;
  }, []);

  const handleDrop = useCallback(() => {
    if (!dragId.current || !dragOverId.current || dragId.current === dragOverId.current) return;
    setFavorites((prev) => {
      const items = [...prev];
      const fromIdx = items.findIndex((f) => f.id === dragId.current);
      const toIdx = items.findIndex((f) => f.id === dragOverId.current);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [item] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, item);
      persistFavorites(items);
      return items;
    });
    dragId.current = null;
    dragOverId.current = null;
  }, []);

  // Hide on mobile or when no favorites
  if (isMobile || favorites.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-100 bg-white px-4 py-1 dark:border-gray-800 dark:bg-gray-950 [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-gray-300 dark:text-gray-700">
          Pinned
        </span>
        <div className="mx-1 h-3 w-px shrink-0 bg-gray-200 dark:bg-gray-700" />
        {favorites.map((fav) => (
          <FavoriteChip
            key={fav.id}
            fav={fav}
            onNavigate={() => navigate(fav.path)}
            onRemove={() => removeFavorite(fav.id)}
            onContextMenu={(e) => handleContextMenu(e, fav.id)}
            onDragStart={() => handleDragStart(fav.id)}
            onDragOver={(e) => handleDragOver(e, fav.id)}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[170px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              removeFavorite(contextMenu.id);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <X className="h-3.5 w-3.5" />
            Remove from favorites
          </button>
        </div>
      )}
    </>
  );
}

function FavoriteChip({
  fav,
  onNavigate,
  onRemove,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  fav: Favorite;
  onNavigate: () => void;
  onRemove: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={onContextMenu}
      className="group flex shrink-0 cursor-pointer select-none items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
      onClick={onNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onNavigate()}
    >
      <GripVertical className="h-3 w-3 cursor-grab text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600" />
      <span>{fav.label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
        title="Remove"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
