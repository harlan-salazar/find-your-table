const $ = (id) => document.getElementById(id);
const norm = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );
const guests = GUESTS.map(([name, table], i) => ({
  i,
  name,
  table,
  words: norm(name).split(" ")
}));

// Header
if (WEDDING.partner1 && WEDDING.partner2) {
  $("eyebrow").textContent = "Welcome to the wedding of";
  $("couple").innerHTML =
    `${esc(WEDDING.partner1)} <span class="amp">&amp;</span> ${esc(WEDDING.partner2)}`;
} else {
  $("eyebrow").textContent = "Welcome to";
  $("couple").innerHTML = `Our <span class="amp">Wedding</span>`;
}
$("date").textContent = WEDDING.date;
$("footer").textContent = WEDDING.footer;

// Small typo tolerance (e.g. "Basilio" vs "Basillio", "Pena" vs "Peña")
function within1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
const exactWord = (t, w) => w.startsWith(t);
const fuzzyWord = (t, w) =>
  t.length >= 4 && (within1(t, w) || within1(t, w.slice(0, t.length)));

function find(q) {
  const terms = q.split(" ");
  const byName = (a, b) => a.name.localeCompare(b.name);
  const exact = guests
    .filter((g) =>
      terms.every((t) => g.words.some((w) => exactWord(t, w)))
    )
    .sort(byName);
  // close spellings come after exact matches
  const close = guests
    .filter(
      (g) =>
        !exact.includes(g) &&
        terms.every((t) =>
          g.words.some((w) => exactWord(t, w) || fuzzyWord(t, w))
        )
    )
    .sort(byName);
  return {
    hits: exact.concat(close),
    terms,
    fuzzy: !exact.length && close.length > 0
  };
}

function highlight(name, terms) {
  return name
    .split(" ")
    .map((w) => {
      const nw = norm(w);
      const t = terms.find((t) => t && nw.startsWith(t));
      return t
        ? `<mark>${esc(w.slice(0, t.length))}</mark>${esc(w.slice(t.length))}`
        : esc(w);
    })
    .join(" ");
}

function search() {
  const q = norm($("q").value);
  const box = $("results");
  if (q.length < 2) {
    box.innerHTML = "";
    return;
  }
  const { hits, terms, fuzzy } = find(q);
  if (!hits.length) {
    box.innerHTML = `<div class="empty">We couldn't find that name.<br>Try just your first or last name, or ask our coordinators at the entrance.</div>`;
    return;
  }
  box.innerHTML =
    (fuzzy ? `<div class="hint">Did you mean…</div>` : "") +
    hits
      .slice(0, 30)
      .map(
        (g) =>
          `<button class="item" data-i="${g.i}">
 <span class="name">${highlight(g.name, terms)}</span>
 ${g.table == null ? `<span class="tbl tbd">See coordinator</span>` : `<span class="tbl">Table ${esc(g.table)}</span>`}
     </button>`
      )
      .join("");
}

function show(g) {
  let body;
  if (g.table == null) {
    body = `<div class="tbdmsg">${esc(WEDDING.noTableMessage)}</div>`;
  } else {
    const mates = guests
      .filter((x) => x.table === g.table && x !== g)
      .map((x) => x.name);
    const tname = TABLE_NAMES[g.table];
    body = `
<div class="label">You are seated at</div>
<div class="num">${esc(g.table)}</div>
${tname ? `<div class="tname">${esc(tname)}</div>` : `<div class="tname">Table ${esc(g.table)}</div>`}
${mates.length ? `<div class="mates"><p>Sharing your table</p><ul>${mates.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>` : ""}`;
  }
  $("resultView").innerHTML = `
    <div class="card">
<div class="hi">Welcome,</div>
<div class="guest">${esc(g.name)}</div>
${body}
    </div>
    <button class="back" id="back">← Search another name</button>`;
  $("searchView").hidden = true;
  $("resultView").hidden = false;
  $("back").onclick = () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
    swapViews($("resultView"), $("searchView"), () => {
      $("q").value = "";
      $("results").innerHTML = "";
      $("q").focus({ preventScroll: true });
    });
  };
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Fade one view out, glide the panel to the new height, fade the other in
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
function swapViews(from, to, after) {
  const wrap = document.querySelector(".wrap");
  let swapped = false;
  const swap = () => {
    if (swapped) return;
    swapped = true;
    const startH = wrap.offsetHeight;
    from.hidden = true;
    from.classList.remove("fade-out");
    to.hidden = false;
    after();
    if (reduceMotion.matches) return;

    to.classList.remove("fade-in");
    void to.offsetWidth; // restart the animation
    to.classList.add("fade-in");

    const endH = wrap.offsetHeight;
    if (startH === endH) return;
    wrap.style.height = startH + "px";
    void wrap.offsetHeight;
    wrap.style.transition = "height 0.4s ease";
    wrap.style.height = endH + "px";
    setTimeout(() => {
      wrap.style.height = "";
      wrap.style.transition = "";
    }, 420);
  };
  if (reduceMotion.matches) return swap();
  from.classList.add("fade-out");
  from.addEventListener("animationend", swap, { once: true });
  setTimeout(swap, 300); // fallback if animationend never fires
}

$("q").addEventListener("input", search);
$("results").addEventListener("click", (e) => {
  const b = e.target.closest(".item");
  if (b) show(guests[+b.dataset.i]);
});
