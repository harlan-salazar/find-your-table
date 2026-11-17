/* =====================================================
   Find Your Table — search and display logic
   Data (WEDDING, TABLE_NAMES, GUESTS) comes from data.js.
   ===================================================== */

const MIN_QUERY_LENGTH = 2; // don't search until this many characters are typed
const MAX_RESULTS = 30;
const MIN_FUZZY_LENGTH = 4; // shorter terms must match exactly (avoids noisy matches)
const FADE_OUT_MS = 300; // fallback in case "animationend" never fires
const HEIGHT_TRANSITION_MS = 400;

const el = {
  eyebrow: document.getElementById("eyebrow"),
  couple: document.getElementById("couple"),
  date: document.getElementById("date"),
  footer: document.getElementById("footer"),
  panel: document.querySelector(".wrap"),
  searchView: document.getElementById("searchView"),
  resultView: document.getElementById("resultView"),
  input: document.getElementById("q"),
  results: document.getElementById("results")
};

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- Text helpers ---------- */

// Lowercase, strip accents ("Peña" → "pena") and punctuation, collapse spaces.
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Make text safe to insert into HTML.
function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  return String(value).replace(/[&<>"]/g, (char) => entities[char]);
}

/* ---------- Guest data ---------- */

const guests = GUESTS.map(([name, table], index) => ({
  index,
  name,
  table, // null = no table assigned yet
  words: normalize(name).split(" ")
}));

const hasTable = (guest) => guest.table != null;

function tablematesOf(guest) {
  return guests
    .filter((other) => other.table === guest.table && other !== guest)
    .map((other) => other.name);
}

/* ---------- Matching ---------- */

// True if a and b differ by at most one inserted, deleted or changed letter.
function isOneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; // extra letter in a
    else if (b.length > a.length) j++; // extra letter in b
    else {
      i++; // different letter
      j++;
    }
  }
  const leftover = a.length - i + (b.length - j);
  return edits + leftover <= 1;
}

// "sal" matches "salazar"
const startsWithTerm = (term, word) => word.startsWith(term);

// "basilio" matches "basillio"; "salazr" matches "salazar"
const isCloseSpelling = (term, word) =>
  term.length >= MIN_FUZZY_LENGTH &&
  (isOneEditApart(term, word) || isOneEditApart(term, word.slice(0, term.length)));

// A guest matches when every typed term matches one of their name's words.
const matchesAllTerms = (guest, terms, wordMatches) =>
  terms.every((term) => guest.words.some((word) => wordMatches(term, word)));

const byName = (a, b) => a.name.localeCompare(b.name);

// Exact (prefix) matches come first, then close spellings.
function findGuests(query) {
  const terms = query.split(" ");

  const exact = guests
    .filter((guest) => matchesAllTerms(guest, terms, startsWithTerm))
    .sort(byName);

  const close = guests
    .filter(
      (guest) =>
        !exact.includes(guest) &&
        matchesAllTerms(
          guest,
          terms,
          (term, word) => startsWithTerm(term, word) || isCloseSpelling(term, word)
        )
    )
    .sort(byName);

  return {
    matches: exact.concat(close),
    terms,
    onlyCloseSpellings: exact.length === 0 && close.length > 0
  };
}

/* ---------- Rendering ---------- */

function renderHeader() {
  const { partner1, partner2, date, footer } = WEDDING;
  if (partner1 && partner2) {
    el.eyebrow.textContent = "Welcome to the wedding of";
    el.couple.innerHTML = `${escapeHtml(partner1)} <span class="amp">&amp;</span> ${escapeHtml(partner2)}`;
  } else {
    el.eyebrow.textContent = "Welcome to";
    el.couple.innerHTML = `Our <span class="amp">Wedding</span>`;
  }
  el.date.textContent = date;
  el.footer.textContent = footer;
}

// Underline the part of each word that matches what the guest typed.
function highlightMatches(name, terms) {
  return name
    .split(" ")
    .map((word) => {
      const term = terms.find((t) => t && normalize(word).startsWith(t));
      if (!term) return escapeHtml(word);
      const matched = word.slice(0, term.length);
      const rest = word.slice(term.length);
      return `<mark>${escapeHtml(matched)}</mark>${escapeHtml(rest)}`;
    })
    .join(" ");
}

function resultItemHtml(guest, terms) {
  const tableLabel = hasTable(guest)
    ? `<span class="tbl">Table ${escapeHtml(guest.table)}</span>`
    : `<span class="tbl tbd">See coordinator</span>`;
  return `
    <button class="item" data-index="${guest.index}">
      <span class="name">${highlightMatches(guest.name, terms)}</span>
      ${tableLabel}
    </button>`;
}

function renderResults() {
  const query = normalize(el.input.value);

  if (query.length < MIN_QUERY_LENGTH) {
    el.results.innerHTML = "";
    return;
  }

  const { matches, terms, onlyCloseSpellings } = findGuests(query);

  if (matches.length === 0) {
    el.results.innerHTML = `
      <div class="empty">
        We couldn't find that name.<br />
        Try just your first or last name, or ask our coordinators at the entrance.
      </div>`;
    return;
  }

  const hint = onlyCloseSpellings ? `<div class="hint">Did you mean…</div>` : "";
  const items = matches
    .slice(0, MAX_RESULTS)
    .map((guest) => resultItemHtml(guest, terms))
    .join("");
  el.results.innerHTML = hint + items;
}

function seatDetailsHtml(guest) {
  if (!hasTable(guest)) {
    return `<div class="tbdmsg">${escapeHtml(WEDDING.noTableMessage)}</div>`;
  }

  const tableName = TABLE_NAMES[guest.table] || `Table ${guest.table}`;
  const mates = tablematesOf(guest);
  const matesHtml = mates.length
    ? `<div class="mates">
         <p>Sharing your table</p>
         <ul>${mates.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>
       </div>`
    : "";

  return `
    <div class="label">You are seated at</div>
    <div class="num">${escapeHtml(guest.table)}</div>
    <div class="tname">${escapeHtml(tableName)}</div>
    ${matesHtml}`;
}

/* ---------- Views ---------- */

function showSeat(guest) {
  el.resultView.innerHTML = `
    <div class="card">
      <div class="hi">Welcome,</div>
      <div class="guest">${escapeHtml(guest.name)}</div>
      ${seatDetailsHtml(guest)}
    </div>
    <button class="back" id="back">← Search another name</button>`;

  el.searchView.hidden = true;
  el.resultView.hidden = false;
  document.getElementById("back").addEventListener("click", backToSearch);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToSearch() {
  window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
  swapViews(el.resultView, el.searchView, () => {
    el.input.value = "";
    el.results.innerHTML = "";
    el.input.focus({ preventScroll: true });
  });
}

/* ---------- Animation ---------- */

// Restart a CSS animation class even if it was applied before.
function replayAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth; // force reflow so the browser sees the change
  element.classList.add(className);
}

// Smoothly resize the panel from its old height to its current content height.
function animatePanelHeight(fromHeight) {
  const panel = el.panel;
  const toHeight = panel.offsetHeight;
  if (fromHeight === toHeight) return;

  panel.style.height = `${fromHeight}px`;
  void panel.offsetHeight; // apply the starting height before transitioning
  panel.style.transition = `height ${HEIGHT_TRANSITION_MS}ms ease`;
  panel.style.height = `${toHeight}px`;

  setTimeout(() => {
    panel.style.height = "";
    panel.style.transition = "";
  }, HEIGHT_TRANSITION_MS + 20);
}

// Fade one view out, swap to the other, then fade it in while the panel resizes.
function swapViews(fromView, toView, onSwap) {
  let hasSwapped = false;

  const swap = () => {
    if (hasSwapped) return;
    hasSwapped = true;

    const startHeight = el.panel.offsetHeight;
    fromView.hidden = true;
    fromView.classList.remove("fade-out");
    toView.hidden = false;
    onSwap();

    if (reduceMotion.matches) return;
    replayAnimation(toView, "fade-in");
    animatePanelHeight(startHeight);
  };

  if (reduceMotion.matches) {
    swap();
    return;
  }
  fromView.classList.add("fade-out");
  fromView.addEventListener("animationend", swap, { once: true });
  setTimeout(swap, FADE_OUT_MS);
}

/* ---------- Start ---------- */

renderHeader();

el.input.addEventListener("input", renderResults);

el.results.addEventListener("click", (event) => {
  const item = event.target.closest(".item");
  if (item) showSeat(guests[Number(item.dataset.index)]);
});
