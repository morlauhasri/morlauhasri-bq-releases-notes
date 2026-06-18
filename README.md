# 📊 BigQuery Release Notes Viewer

A lightweight **Python Flask** web application that fetches and displays the latest **Google BigQuery release notes** live from the official Google Cloud Atom feed — with a clean, modern UI, category badges, expandable cards, and one-click sharing to X (Twitter).

---

## ✨ Features

- 🔴 **Live Feed** — Pulls release notes in real time from the official Google Cloud Atom feed
- 🗂️ **Category Badges** — Automatically tags entries as `Feature`, `Announcement`, `Deprecated`, `Changed`, `Issue`, etc.
- 🃏 **Expandable Cards** — Click any entry to expand/collapse its full content (rendered as HTML)
- 🔄 **Manual Refresh** — Refresh button with a spinner and timestamp showing when data was last fetched
- 📢 **Share on X (Twitter)** — Pre-filled tweet modal with character counter (280-char limit enforced)
- 💀 **Skeleton Loading** — Animated skeleton cards during fetch for a polished UX
- ⚠️ **Error Handling** — Friendly error banners for timeouts, connection failures, and bad responses
- ♿ **Accessible** — ARIA roles, keyboard navigation (Enter/Space to expand cards, Escape to close modal)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3, Flask ≥ 3.0 |
| **HTTP Client** | `requests` ≥ 2.31 |
| **Feed Parsing** | Python `xml.etree.ElementTree` (stdlib) |
| **Frontend** | Vanilla HTML, CSS, JavaScript (no frameworks) |
| **Fonts** | Inter + JetBrains Mono (Google Fonts) |
| **Data Source** | [Google Cloud BigQuery Release Notes Feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml) |

---

## 📁 Project Structure

```
bq-releases-notes/
├── app.py                  # Flask app — API route + XML feed parser
├── requirements.txt        # Python dependencies
├── .gitignore              # Git ignore rules
├── templates/
│   └── index.html          # Main page template
└── static/
    ├── style.css           # All styling (dark theme, animations, badges)
    └── main.js             # Frontend logic (fetch, render, modal, share)
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- `pip`

### 1. Clone the repository

```bash
git clone https://github.com/morlauhasri/morlauhasri-bq-releases-notes.git
cd morlauhasri-bq-releases-notes
```

### 2. Create and activate a virtual environment

```bash
# Create
python -m venv venv

# Activate (macOS/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the development server

```bash
python app.py
```

Open your browser at **http://localhost:5000**

---

## 🔌 API

The app exposes a single internal JSON endpoint used by the frontend.

### `GET /api/release-notes`

Fetches and parses the BigQuery Atom feed, returning structured JSON.

**Success Response (`200 OK`)**

```json
{
  "ok": true,
  "data": {
    "feed_title": "BigQuery Release Notes",
    "feed_updated": "2026-06-01T00:00:00Z",
    "fetched_at": "2026-06-18 04:45:00 UTC",
    "entries": [
      {
        "id": "...",
        "title": "June 01, 2026",
        "updated": "2026-06-01T00:00:00Z",
        "link": "https://cloud.google.com/bigquery/docs/release-notes#...",
        "content_html": "<p>...</p>",
        "content_plain": "...",
        "categories": ["Feature", "Announcement"]
      }
    ]
  }
}
```

**Error Response**

```json
{
  "ok": false,
  "error": "Request timed out. Please try again."
}
```

| HTTP Status | Cause |
|---|---|
| `504` | Upstream request timed out |
| `503` | Connection error (no internet) |
| `502` | HTTP error from Google Cloud |
| `500` | XML parse failure or unexpected error |

---

## 🏷️ Category Badges

The app extracts `<h3>` headings from each entry's HTML content and maps them to colored badge styles:

| Category keyword | Badge style |
|---|---|
| `feature` | 🟦 Blue — Feature |
| `announcement` | 🟣 Purple — Announcement |
| `deprecated` / `deprecation` / `breaking` | 🔴 Red — Deprecated |
| `issue` / `security` | 🟠 Orange — Issue |
| `changed` / `libraries` / `library` | 🟡 Yellow — Changed |
| *(anything else)* | ⬜ Grey — Default |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

> **Data Source**: Release notes are sourced directly from [Google Cloud](https://cloud.google.com/bigquery/docs/release-notes) and are the property of Google LLC.
