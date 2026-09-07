/** Pillar intro in main#main — left-aligned, no compass, one heading. */
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
    <div className="flex flex-col items-start py-4 text-left sm:py-8">
      <p
        className="text-sm font-semibold uppercase tracking-widest"
        style={{ color }}
      >
        {name}
      </p>
      <h2 className="mt-3 max-w-[18ch] font-display text-3xl font-semibold text-light sm:text-4xl">
        {question}
      </h2>
      <p className="mt-4 max-w-md text-base text-dim">{description}</p>
    </div>
  );
}
