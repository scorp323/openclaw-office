/** Utility functions for exporting data as PNG/CSV downloads */

/**
 * Serialize an SVG element to a PNG blob and trigger download.
 * Uses canvas + SVG serialization — no external libraries.
 */
export function exportSvgAsPng(
  svgElement: SVGSVGElement,
  filename = "office-floor-plan.png",
  scale = 2,
): void {
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

  // Ensure explicit dimensions for the canvas
  const viewBox = svgElement.viewBox.baseVal;
  const width = viewBox.width || svgElement.clientWidth;
  const height = viewBox.height || svgElement.clientHeight;
  svgClone.setAttribute("width", String(width));
  svgClone.setAttribute("height", String(height));

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgClone);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, filename);
    }, "image/png");
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/**
 * Convert an array of objects to a CSV string and trigger download.
 */
export function exportCsv(
  rows: Record<string, string | number>[],
  filename: string,
): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? "");
          // Escape quotes and wrap in quotes if contains comma/quote/newline
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(","),
    ),
  ];

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
