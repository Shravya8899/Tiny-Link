import express from 'express';
import bodyParser from 'body-parser';
import { Pool } from 'pg';
import { nanoid } from 'nanoid';
import validUrl from 'valid-url';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// PostgreSQL (Neon)
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// ensure table exists on start
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id SERIAL PRIMARY KEY,
        short_id VARCHAR(10) UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        clicks INT DEFAULT 0,
        last_clicked TIMESTAMP
      );
    `);
    console.log('✅ Table ensured');
  } catch (err) {
    console.error('❌ Could not ensure table', err);
  }
})();

// ROUTES

// Dashboard (renders server-side for first load)
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM urls ORDER BY id DESC');
    res.render('dashboard', { links: result.rows, baseUrl: BASE_URL });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// API - create link
app.post('/api/links', async (req, res) => {
  const { originalUrl, customCode } = req.body;
  if (!originalUrl || !validUrl.isUri(originalUrl)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  const shortId = (customCode || nanoid(6)).replace(/\s+/g, '');

  try {
    await pool.query(
      'INSERT INTO urls (short_id, original_url) VALUES ($1, $2)',
      [shortId, originalUrl]
    );
    return res.json({ shortUrl: `${BASE_URL}/${shortId}`, shortId });
  } catch (err) {
    // unique violation code for Postgres
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Code already exists' });
    }
    console.error('Insert error', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// API - list links (json)
app.get('/api/links', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM urls ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// API - get a single link (stats)
app.get('/api/links/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const result = await pool.query('SELECT * FROM urls WHERE short_id=$1', [code]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// API - delete link
app.delete('/api/links/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const result = await pool.query('DELETE FROM urls WHERE short_id=$1 RETURNING *', [code]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Stats page (single code)
app.get('/code/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

// Redirect
app.get('/:shortId', async (req, res) => {
  const { shortId } = req.params;
  try {
    const result = await pool.query('SELECT original_url FROM urls WHERE short_id=$1', [shortId]);
    if (result.rows.length === 0) return res.status(404).send('URL not found');

    await pool.query('UPDATE urls SET clicks = clicks + 1, last_clicked = NOW() WHERE short_id=$1', [shortId]);
    return res.redirect(result.rows[0].original_url);
  } catch (err) {
    console.error('Redirect error', err);
    return res.status(500).send('Server error');
  }
});

// Health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true, version: '1.0' });
});

// start
app.listen(PORT, () => {
  console.log(`🚀 TinyLink app running at ${BASE_URL || `http://localhost:${PORT}`}`);
});
