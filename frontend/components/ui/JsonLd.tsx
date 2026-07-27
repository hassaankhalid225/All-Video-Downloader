/**
 * Renders schema objects into a single `application/ld+json` tag.
 *
 * The payload is always built from local constants in `lib/structured-data.ts`, never
 * from user input or API responses, which is what makes the `dangerouslySetInnerHTML`
 * here safe.
 */
export function JsonLd({ schemas }: { schemas: object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schemas.length === 1 ? schemas[0] : schemas),
      }}
    />
  )
}
