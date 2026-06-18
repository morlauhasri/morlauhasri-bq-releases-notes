import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template
from datetime import datetime, timezone
import re

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ATOM_NS = "http://www.w3.org/2005/Atom"


def strip_html_tags(html_text: str) -> str:
    """Remove HTML tags and return plain text, preserving some structure."""
    # Replace block-level tags with newlines
    html_text = re.sub(r"<h[1-6][^>]*>", "\n**", html_text)
    html_text = re.sub(r"</h[1-6]>", "**\n", html_text)
    html_text = re.sub(r"</?p[^>]*>", "\n", html_text)
    html_text = re.sub(r"<br\s*/?>", "\n", html_text)
    html_text = re.sub(r"<li[^>]*>", "• ", html_text)
    html_text = re.sub(r"</li>", "\n", html_text)
    # Strip remaining tags
    html_text = re.sub(r"<[^>]+>", "", html_text)
    # Decode common HTML entities
    html_text = html_text.replace("&amp;", "&")
    html_text = html_text.replace("&lt;", "<")
    html_text = html_text.replace("&gt;", ">")
    html_text = html_text.replace("&quot;", '"')
    html_text = html_text.replace("&#39;", "'")
    html_text = html_text.replace("&nbsp;", " ")
    # Collapse excessive whitespace / blank lines
    html_text = re.sub(r"\n{3,}", "\n\n", html_text)
    return html_text.strip()


def parse_feed(xml_bytes: bytes) -> dict:
    root = ET.fromstring(xml_bytes)

    def tag(name: str) -> str:
        return f"{{{ATOM_NS}}}{name}"

    feed_title = root.findtext(tag("title"), default="BigQuery Release Notes")
    feed_updated_raw = root.findtext(tag("updated"), default="")

    entries = []
    for entry in root.findall(tag("entry")):
        title = entry.findtext(tag("title"), default="")
        entry_id = entry.findtext(tag("id"), default="")
        updated_raw = entry.findtext(tag("updated"), default="")
        link_el = entry.find(tag("link"))
        link_href = link_el.get("href", "#") if link_el is not None else "#"
        content_el = entry.find(tag("content"))
        content_html = content_el.text if content_el is not None else ""
        content_plain = strip_html_tags(content_html or "")

        # Determine category badges from h3 headings inside content
        categories = re.findall(r"<h3[^>]*>(.*?)</h3>", content_html or "", re.IGNORECASE)

        entries.append(
            {
                "id": entry_id,
                "title": title,
                "updated": updated_raw,
                "link": link_href,
                "content_html": content_html,
                "content_plain": content_plain,
                "categories": list(dict.fromkeys(categories)),  # deduplicate preserving order
            }
        )

    return {
        "feed_title": feed_title,
        "feed_updated": feed_updated_raw,
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "entries": entries,
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/release-notes")
def release_notes():
    try:
        resp = requests.get(FEED_URL, timeout=15)
        resp.raise_for_status()
        data = parse_feed(resp.content)
        return jsonify({"ok": True, "data": data})
    except requests.exceptions.Timeout:
        return jsonify({"ok": False, "error": "Request timed out. Please try again."}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"ok": False, "error": "Could not connect to Google Cloud. Check your internet connection."}), 503
    except requests.exceptions.HTTPError as exc:
        return jsonify({"ok": False, "error": f"HTTP error {exc.response.status_code} from upstream."}), 502
    except ET.ParseError as exc:
        return jsonify({"ok": False, "error": f"Failed to parse XML feed: {exc}"}), 500
    except Exception as exc:  # pylint: disable=broad-except
        return jsonify({"ok": False, "error": str(exc)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
