import { useEffect, useRef } from "react";

const CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  length: number;
}

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fontSize = 14;
    const charHeight = fontSize * 1.2;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      initColumns(rect.width, rect.height);
    }

    function initColumns(w: number, h: number) {
      const colCount = Math.floor(w / fontSize);
      const cols: Column[] = [];
      for (let i = 0; i < colCount; i++) {
        const len = 8 + Math.floor(Math.random() * 20);
        cols.push({
          x: i * fontSize,
          y: -Math.random() * h * 2,
          speed: 1 + Math.random() * 3,
          length: len,
          chars: Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
        });
      }
      columnsRef.current = cols;
    }

    function draw() {
      const rect = canvas!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Fade trail — semi-transparent black overlay
      ctx!.fillStyle = "rgba(0, 0, 0, 0.06)";
      ctx!.fillRect(0, 0, w, h);

      ctx!.font = `${fontSize}px monospace`;

      for (const col of columnsRef.current) {
        for (let j = 0; j < col.length; j++) {
          const charY = col.y + j * charHeight;
          if (charY < -charHeight || charY > h + charHeight) continue;

          // Head character is brightest
          const distFromHead = col.length - 1 - j;
          let alpha: number;
          if (distFromHead === 0) {
            alpha = 0.9;
          } else if (distFromHead < 3) {
            alpha = 0.5 - distFromHead * 0.1;
          } else {
            alpha = Math.max(0.05, 0.3 - (distFromHead / col.length) * 0.3);
          }

          // Head char: white-green, rest: matrix green fading to dark forest
          if (distFromHead === 0) {
            ctx!.fillStyle = `rgba(180, 255, 180, ${alpha})`;
            ctx!.shadowColor = "#00ff41";
            ctx!.shadowBlur = 8;
          } else {
            const g = Math.max(51, 255 - distFromHead * 15);
            ctx!.fillStyle = `rgba(0, ${g}, ${Math.floor(g * 0.25)}, ${alpha})`;
            ctx!.shadowColor = "transparent";
            ctx!.shadowBlur = 0;
          }

          ctx!.fillText(col.chars[j], col.x, charY);

          // Randomly mutate characters
          if (Math.random() < 0.02) {
            col.chars[j] = CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }

        // Reset shadow after drawing
        ctx!.shadowBlur = 0;

        col.y += col.speed;

        // Reset column when it's fully off screen
        if (col.y > h + col.length * charHeight) {
          col.y = -col.length * charHeight - Math.random() * h * 0.5;
          col.speed = 1 + Math.random() * 3;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    rafRef.current = requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      style={{ opacity: 0.2 }}
    />
  );
}
