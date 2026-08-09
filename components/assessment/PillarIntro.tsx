/** Full-screen-feel intro card shown before each pillar's questions begin. */
export function PillarIntro({
  color,
  name,
  question,
  description,
}: {
  color: string;
  name: string;
  question: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <span
        className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: `${color}1a`, boxShadow: `0 0 40px ${color}33` }}
      >
        <span
          className="h-4 w-4 rounded-full"
          style={{ background: color, boxShadow: `0 0 12px ${color}` }}
        />
      </span>
      <p className="text-sm font-semibold uppercase tracking-widest" style={{ color }}>
        {name}
      </p>
      <h2 className="mt-3 font-display text-3xl font-semibold text-light sm:text-4xl">
        {question}
      </h2>
      <p className="mt-4 max-w-md text-base text-dim">{description}</p>
    </div>
  );
}
