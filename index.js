import express from 'express';
import bodyParser from 'body-parser';
import validUrl from 'valid-url';
import { nanoid } from 'nanoid';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// PostgreSQL Client
const client = new Client({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

// Dashboard
app.get('/', async (req, res) => {
  const result = await client.query('SELECT * FROM urls ORDER BY id DESC');
  res.render('dashboard', { links: result.rows, baseUrl: BASE_URL });
});

// Create short link
app.post('/api/links', async (req, res) => {
  const { originalUrl, customCode } = req.body;
  if (!validUrl.isUri(originalUrl)) return res.status(400).json({ error: 'Invalid URL' });

  const shortId = customCode || nanoid(6);

  try {
    await client.query('INSERT INTO urls (short_id, original_url) VALUES ($1, $2)', [shortId, originalUrl]);
    res.json({ shortUrl: `${BASE_URL}/${shortId}`, shortId });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Code already exists' });
    res.status(500).json({ error: 'Database error' });
  }
});

// Redirect
app.get('/:shortId', async (req, res) => {
  const { shortId } = req.params;
  try {
    const result = await client.query('SELECT original_url, clicks FROM urls WHERE short_id=$1', [shortId]);
    if (!result.rows.length) return res.status(404).send('URL not found');

    await client.query('UPDATE urls SET clicks = clicks + 1, last_clicked = NOW() WHERE short_id=$1', [shortId]);
    res.redirect(result.rows[0].original_url);
  } catch {
    res.status(500).send('Server error');
  }
});

// Delete link
app.delete('/api/links/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const result = await client.query('DELETE FROM urls WHERE short_id=$1 RETURNING *', [code]);
    if (!result.rows.length) return res.status(404).json({ error: 'Link not found' });
    res.json({ message: 'Deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Healthcheck
app.get('/healthz', (req, res) => res.json({ ok: true, version: '1.0' }));

app.listen(PORT, () => console.log(`🚀 TinyLink running on ${BASE_URL}`));
