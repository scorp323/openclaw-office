import { useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const SWIPE_THRESHOLD = 50;
const NAV_PAGES = ["/", "/office", "/chat", "/dashboard", "/agents", "/cron", "/settings"];

export function useSwipeNavigation(containerRef: React.RefObject<HTMLElement | null>) {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;

      // Ignore if vertical swipe is dominant
      if (Math.abs(dy) > Math.abs(dx)) return;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;

      const currentIndex = NAV_PAGES.indexOf(location.pathname);
      if (currentIndex === -1) return;

      if (dx > 0 && currentIndex > 0) {
        // Swipe right → previous page
        navigate(NAV_PAGES[currentIndex - 1]);
      } else if (dx < 0 && currentIndex < NAV_PAGES.length - 1) {
        // Swipe left → next page
        navigate(NAV_PAGES[currentIndex + 1]);
      }
    },
    [location.pathname, navigate],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [containerRef, handleTouchStart, handleTouchEnd]);
}
