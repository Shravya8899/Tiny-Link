import 'dotenv/config';
import express from 'express';
import { Client } from '@neondatabase/serverless';
import bodyParser from 'body-parser';
import validUrl from 'valid-url';
import { nanoid } from 'nanoid';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Connect to Neon DB
const client = new Client({
  connectionString: process.env.NEON_DATABASE_URL
});

(async () => {
  try {
    await client.connect();
    console.log('Database connected successfully');

    // Create table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id SERIAL PRIMARY KEY,
        short_id VARCHAR(10) UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        clicks INT DEFAULT 0,
        last_clicked TIMESTAMP
      );
    `);
  } catch (err) {
    console.error(' DB Connection failed:', err.message);
  }
})();

// Create a new short link
app.post('/api/links', async (req, res) => {
  const { originalUrl, customCode } = req.body;

  if (!validUrl.isUri(originalUrl)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const shortId = customCode || nanoid(6);

  try {
    // Check if custom code exists
    if (customCode) {
      const existing = await client.query(
        'SELECT * FROM urls WHERE short_id=$1',
        [shortId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Code already exists' });
      }
    }

    await client.query(
      'INSERT INTO urls (short_id, original_url) VALUES ($1, $2)',
      [shortId, originalUrl]
    );
    res.json({ shortUrl: `${req.protocol}://${req.get('host')}/${shortId}`, shortId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// List all links
app.get('/api/links', async (req, res) => {
  try {
    const result = await client.query('SELECT short_id, original_url, clicks, last_clicked FROM urls ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get stats for a single code
app.get('/api/links/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const result = await client.query(
      'SELECT short_id, original_url, clicks, last_clicked FROM urls WHERE short_id=$1',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Code not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete a link
app.delete('/api/links/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const result = await client.query('DELETE FROM urls WHERE short_id=$1 RETURNING *', [code]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Code not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Redirect route
app.get('/:shortId', async (req, res) => {
  const { shortId } = req.params;

  try {
    const result = await client.query(
      'SELECT original_url, clicks FROM urls WHERE short_id=$1',
      [shortId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('URL not found');
    }

    // Increment clicks and update last clicked time
    await client.query(
      'UPDATE urls SET clicks = clicks + 1, last_clicked = NOW() WHERE short_id=$1',
      [shortId]
    );

    res.redirect(result.rows[0].original_url);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true, version: '1.0' });
});

// Start server
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
