"use client";

export function PulseDot({
  color,
  size = 6,
  className,
}: {
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex rounded-full ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, backgroundColor: color }}
      />
    </span>
  );
}

export default PulseDot;
