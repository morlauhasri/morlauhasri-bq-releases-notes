/* =====================================================
   BigQuery Release Notes — main.js
   ===================================================== */

'use strict';

// ── DOM refs ──────────────────────────────────────────
const refreshBtn        = document.getElementById('refresh-btn');
const refreshLabel      = document.getElementById('refresh-label');
const refreshIcon       = document.getElementById('refresh-icon');
const spinnerIcon       = document.getElementById('spinner-icon');
const notesContainer    = document.getElementById('notes-container');
const skeletonContainer = document.getElementById('skeleton-container');
const errorBanner       = document.getElementById('error-banner');
const errorMessage      = document.getElementById('error-message');
const fetchTimestamp    = document.getElementById('fetch-timestamp');
const statsBar          = document.getElementById('stats-bar');
const entryCount        = document.getElementById('entry-count');
const lastUpdated       = document.getElementById('last-updated');
const emptyState        = document.getElementById('empty-state');

const tweetModal        = document.getElementById('tweet-modal');
const tweetTextarea     = document.getElementById('tweet-textarea');
const charCounter       = document.getElementById('char-counter');
const modalEntryTitle   = document.getElementById('modal-entry-title');
const modalEntryLink    = document.getElementById('modal-entry-link');

// ── State ─────────────────────────────────────────────
let currentNotes = [];

// ── Category → CSS class map ──────────────────────────
const BADGE_CLASS_MAP = {
  'feature':      'badge-feature',
  'announcement': 'badge-announce',
  'deprecated':   'badge-deprecated',
  'deprecation':  'badge-deprecated',
  'issue':        'badge-issue',
  'breaking':     'badge-deprecated',
  'changed':      'badge-changed',
  'security':     'badge-issue',
  'libraries':    'badge-changed',
  'library':      'badge-changed',
};

function badgeClass(cat) {
  const key = (cat || '').toLowerCase().trim();
  return BADGE_CLASS_MAP[key] || 'badge-default';
}

// ── Helpers ───────────────────────────────────────────
function formatDate(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  } catch {
    return isoString;
  }
}

function setLoading(loading) {
  refreshBtn.disabled = loading;
  refreshIcon.classList.toggle('hidden', loading);
  spinnerIcon.classList.toggle('hidden', !loading);
  refreshLabel.textContent = loading ? 'Refreshing…' : 'Refresh';
  skeletonContainer.classList.toggle('hidden', !loading);
  if (loading) {
    notesContainer.innerHTML = '';
    errorBanner.classList.add('hidden');
    statsBar.classList.add('hidden');
    emptyState.classList.add('hidden');
  }
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.classList.remove('hidden');
}

// ── Build a single card ───────────────────────────────
function buildCard(entry, index) {
  const card = document.createElement('article');
  card.className = 'note-card';
  card.setAttribute('aria-label', `Release notes for ${entry.title}`);
  card.style.animationDelay = `${index * 40}ms`;

  // ── Badges HTML
  const badgesHtml = (entry.categories || [])
    .map(cat => `<span class="badge ${badgeClass(cat)}">${escHtml(cat)}</span>`)
    .join('');

  // ── Docs link
  const docsLink = entry.link && entry.link !== '#'
    ? `<a class="docs-link" href="${escHtml(entry.link)}" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        View on Google Cloud
       </a>`
    : '';

  card.innerHTML = `
    <div class="card-header" role="button" tabindex="0" aria-expanded="false" onclick="toggleCard(this)">
      <div class="card-date-wrap">
        <span class="card-date">${escHtml(entry.title)}</span>
        <div class="badges">${badgesHtml}</div>
      </div>
      <div class="card-header-right">
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
    <div class="card-body">
      <div class="release-content">${entry.content_html || '<p>No content available.</p>'}</div>
      <div class="card-footer">
        ${docsLink}
        <button class="tweet-card-btn" onclick="openModal(${index})" aria-label="Share this update on X (Twitter)">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="x-logo-sm" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
          </svg>
          Share on X
        </button>
      </div>
    </div>`;

  return card;
}

// ── Render all cards ──────────────────────────────────
function renderNotes(data) {
  const { entries, feed_updated, fetched_at } = data;

  if (!entries || entries.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  currentNotes = entries;
  notesContainer.innerHTML = '';
  entries.forEach((entry, i) => notesContainer.appendChild(buildCard(entry, i)));

  // Stats
  entryCount.textContent  = `${entries.length} entries`;
  lastUpdated.textContent = `Feed updated: ${formatDate(feed_updated)}`;
  fetchTimestamp.textContent = `Fetched ${fetched_at}`;
  statsBar.classList.remove('hidden');
}

// ── Toggle card expand / collapse ─────────────────────
function toggleCard(headerEl) {
  const card = headerEl.closest('.note-card');
  const isExpanded = card.classList.contains('expanded');
  card.classList.toggle('expanded', !isExpanded);
  headerEl.setAttribute('aria-expanded', String(!isExpanded));
}

// Keyboard accessibility for card header
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card-header')) {
    e.preventDefault();
    toggleCard(e.target);
  }
  if (e.key === 'Escape') closeModal();
});

// ── Fetch release notes ───────────────────────────────
async function fetchNotes() {
  setLoading(true);
  try {
    const res  = await fetch('/api/release-notes');
    const json = await res.json();
    if (!json.ok) {
      showError(json.error || 'Unknown error.');
    } else {
      renderNotes(json.data);
    }
  } catch (err) {
    showError('Network error – could not reach the server. Is Flask running?');
  } finally {
    setLoading(false);
  }
}

// ── Tweet modal ───────────────────────────────────────
function buildTweetText(entry) {
  const title   = entry.title || '';
  const link    = entry.link && entry.link !== '#' ? entry.link : '';
  // Strip HTML from plain text summary (max ~180 chars)
  const plain   = (entry.content_plain || '').replace(/\*\*/g, '').trim();
  const maxBody = 200 - title.length - link.length - 30;
  const body    = plain.length > maxBody ? plain.slice(0, maxBody - 1) + '…' : plain;
  return `📢 #BigQuery Release Notes — ${title}\n\n${body}\n\n${link}\n\n#GoogleCloud #DataEngineering`;
}

function openModal(index) {
  const entry = currentNotes[index];
  if (!entry) return;

  const text = buildTweetText(entry);
  tweetTextarea.value = text;
  updateCharCount();

  modalEntryTitle.textContent  = entry.title;
  modalEntryLink.href          = entry.link || '#';
  modalEntryLink.style.display = entry.link && entry.link !== '#' ? '' : 'none';

  tweetModal.classList.remove('hidden');
  tweetModal.setAttribute('data-index', index);
  setTimeout(() => tweetTextarea.focus(), 100);
}

function closeModal() {
  tweetModal.classList.add('hidden');
}

// Close modal on overlay click
tweetModal.addEventListener('click', (e) => {
  if (e.target === tweetModal) closeModal();
});

function updateCharCount() {
  const len = tweetTextarea.value.length;
  charCounter.textContent = `${len} / 280`;
  charCounter.classList.toggle('warn',  len >= 240 && len < 280);
  charCounter.classList.toggle('limit', len >= 280);
}

tweetTextarea.addEventListener('input', updateCharCount);

function openTweet() {
  const text        = encodeURIComponent(tweetTextarea.value);
  const twitterUrl  = `https://twitter.com/intent/tweet?text=${text}`;
  window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
}

// ── HTML escape helper ────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Auto-load on page ready ───────────────────────────
fetchNotes();
