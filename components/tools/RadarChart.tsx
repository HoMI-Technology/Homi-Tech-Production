"use client";

interface RadarDatum {
  label: string;
  value: number; // 0-100
}

/** Hand-built 9-axis radar/spider chart, client-safe pure SVG. */
export function RadarChart({ data, size = 420 }: { data: RadarDatum[]; size?: number }) {
  const center = size / 2;
  const maxRadius = size * 0.36;
  const n = data.length;
  const angleStep = (Math.PI * 2) / n;
  const startAngle = -Math.PI / 2;

  function pointFor(index: number, valueRatio: number) {
    const angle = startAngle + index * angleStep;
    const r = maxRadius * valueRatio;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  }

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPoints = data.map((d, i) => pointFor(i, Math.max(0.02, d.value / 100)));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height={size} role="img" aria-label="Behavioral genome radar chart across 9 dimensions">
      {/* Grid rings */}
      {rings.map((ratio) => {
        const ringPoints = data.map((_, i) => pointFor(i, ratio));
        return (
          <polygon
            key={ratio}
            points={ringPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="1"
          />
        );
      })}

      {/* Axis lines */}
      {data.map((_, i) => {
        const outer = pointFor(i, 1);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <polygon points={dataPath} fill="#22d3ee" fillOpacity="0.22" stroke="#22d3ee" strokeWidth="2" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#22d3ee" />
      ))}

      {/* Labels */}
      {data.map((d, i) => {
        const labelPoint = pointFor(i, 1.22);
        const angle = startAngle + i * angleStep;
        const anchor = Math.cos(angle) > 0.3 ? "start" : Math.cos(angle) < -0.3 ? "end" : "middle";
        return (
          <text
            key={d.label}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="10.5"
            fill="#e2e8f0"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
