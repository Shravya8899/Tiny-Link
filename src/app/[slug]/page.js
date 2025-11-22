import { neon } from "@neondatabase/serverless";

const db = neon(process.env.NEON_DATABASE_URL);

export default async function RedirectPage({ params }) {
  const { slug } = params;

  const result = await db.query("SELECT url FROM links WHERE slug = $1", [slug]);
  const url = result.rows[0]?.url;

  if (!url) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Link not found</h1>
      </div>
    );
  }

  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content={`0; url=${url}`} />
      </head>
      <body>
        <p>Redirecting to <a href={url}>{url}</a></p>
      </body>
    </html>
  );
}
