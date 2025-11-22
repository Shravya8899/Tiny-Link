import { neon } from "@neondatabase/serverless";

// Initialize Neon client
const db = neon(process.env.NEON_DATABASE_URL);

// Generate a random slug
function generateSlug(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

export async function POST(req) {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), { status: 400 });
    }

    // Generate slug
    let slug = generateSlug();

    // Optional: check uniqueness
    const exists = await db.query("SELECT slug FROM links WHERE slug = $1", [slug]);
    if (exists.rows.length > 0) {
      slug = generateSlug();
    }

    // Insert into database
    await db.query("INSERT INTO links (slug, url) VALUES ($1, $2)", [slug, url]);

    return new Response(
      JSON.stringify({ slug, shortUrl: `http://localhost:3000/${slug}` }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

