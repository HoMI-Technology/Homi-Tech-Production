/**
 * Renders a single JSON-LD <script> tag from a structured-data object.
 * Server component — no client JS, no hydration cost.
 *
 * `<` is escaped so a value that happens to contain "</script>" (or any
 * other tag) can never prematurely close the surrounding script element.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    // eslint-disable-next-line react/no-danger -- JSON-LD requires a raw <script> body.
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
