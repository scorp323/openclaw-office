import { useLayoutEffect, useRef } from "react";
import { Outlet } from "react-router-dom";

/**
 * Wraps the route Outlet with a smooth enter animation.
 * On location change: new page fades in (opacity 0→1, translateY 8px→0) in 150ms.
 * Uses useLayoutEffect to synchronously reset styles before first paint.
 */
export function PageTransition({ locationKey }: { locationKey: string }) {
  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = divRef.current;
    if (!el) return;

    // Synchronously set initial state before browser paints
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transition = "none";

    // Double rAF: first frame commits the initial style, second triggers transition
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        el.style.transition = "opacity 150ms ease-out, transform 150ms ease-out";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [locationKey]);

  return (
    <div ref={divRef}>
      <Outlet />
    </div>
  );
}
