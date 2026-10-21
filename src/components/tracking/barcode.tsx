import { code128 } from "@/domain/barcode";

/** Code 128 barcode as crisp SVG bars, with quiet zones either side. */
export function Barcode({ value, className }: { value: string; className?: string }) {
  const widths = code128(value);
  const quiet = 10;
  const total = widths.reduce((a, b) => a + b, 0) + quiet * 2;
  let x = quiet;
  const bars: { x: number; w: number }[] = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w }); // even positions are bars, odd are spaces
    x += w;
  });
  return (
    <svg viewBox={`0 0 ${total} 60`} preserveAspectRatio="none" shapeRendering="crispEdges" className={className} role="img" aria-label={`Barcode for ${value}`}>
      <rect width={total} height={60} fill="#fff" />
      {bars.map((b) => (
        <rect key={b.x} x={b.x} width={b.w} height={60} fill="#000" />
      ))}
    </svg>
  );
}
