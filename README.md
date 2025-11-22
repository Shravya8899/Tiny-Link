# TinyLink - URL Shortener

A small web app similar to bit.ly that allows users to shorten URLs, view click statistics, and manage links.  

Created by **Shravya Reddy**

---

## 🚀 Features

- Create short links (custom code optional)
- Redirect from short links to original URLs
- View link statistics: clicks, last clicked
- Delete links
- Dashboard with copy button for generated links
- Stats page for individual links (`/code/:code`)
- Health check endpoint (`/healthz`)
- Responsive UI with typing effect for input

---

## 📦 Tech Stack

- **Backend:** Node.js + Express
- **Database:** Neon (Postgres)
- **Frontend:** HTML, Tailwind CSS, Vanilla JS
- **Deployment:** Render, Vercel, or Railway (free)

---

## ⚡ Endpoints

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/links` | Create a new short link |
| GET    | `/api/links` | List all links |
| GET    | `/api/links/:code` | Get stats for one link |
| DELETE | `/api/links/:code` | Delete a link |

### Pages / Routes

| Path | Purpose |
|------|---------|
| `/` | Dashboard (list, add, delete links) |
| `/code/:code` | Stats page for individual link |
| `/:code` | Redirect to original URL |
| `/healthz` | Health check (returns status 200) |

---

## 📌 Usage

1. Clone the repository:

```bash
git clone <your-github-url>
cd tinylink
