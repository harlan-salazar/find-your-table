# Find Your Table

A small, mobile-friendly page for Mae & Kent's wedding reception (November 27, 2026). Guests type their name and see their table number and who they're sitting with.

It's plain HTML, CSS and JavaScript. You don't need to install or build anything.

## Features

- **Name search** matches first or last names as you type, ignores capitalization and accents, and allows small typos (e.g. "Basilio" finds "Basillio").
- **Seat card** shows the guest's table number and the other guests at their table.
- **Guests without a table** see a message asking them to talk to the coordinators at the entrance.
- **Matches the invitation's look**: sage panel, grey background, script lettering.

## Project structure

```
index.html       Page markup
css/styles.css   Styles (colors are at the top in :root)
js/data.js       Wedding details and guest list (edit this one)
js/app.js        Search and display logic
```

## Updating the guest list

Everything you'll normally change is in [`js/data.js`](js/data.js).

**Add or move a guest**: each guest is one line, `["Name", table number]`:

```js
["Juan Dela Cruz", 7],      // seated at table 7
["Maria Santos", null],     // no table yet → "See coordinator"
```

Every line except the last must end with a comma.

**Wedding details** live in the `WEDDING` object: names, date, footer text, and the message shown to guests without a table.

**Table names (optional)** show under the number on the seat card:

```js
const TABLE_NAMES = { 1: "Family Table", 2: "Ninongs & Ninangs" };
```

## Running it locally

Open `index.html` in a browser, or use a server that reloads the page when you save:

- **VS Code:** install the **Live Server** extension, right-click `index.html`, then choose **Open with Live Server**
- **Terminal:** `npx live-server` or `python3 -m http.server 8000`

To try it on your phone, connect to the same Wi-Fi as your computer and open `http://<your-computer-ip>:<port>`. You can find your Mac's IP with `ipconfig getifaddr en0`.

If the page is blank after editing `data.js`, open the browser console (Cmd+Option+I). It's usually a missing comma or quote.

## Publishing with GitHub Pages

1. Push to GitHub.
2. In the repo, go to **Settings → Pages**, set **Source** to *Deploy from a branch*, and choose `main` / `/ (root)`.
3. After a minute or so, the site is live at `https://<username>.github.io/find-your-table/`.

Put the link on a QR code at the reception entrance so guests can scan it.

## Privacy

The guest list is in `js/data.js`, so anyone who can open the site or the repository can see every name and table assignment. Keep the repo private if you don't want the code public. Note that GitHub Pages on a free account requires a public repo.

## Customizing the look

- **Colors:** edit the variables at the top of `css/styles.css` (`--sage`, `--bg`, and so on).
- **Fonts:** [Jost](https://fonts.google.com/specimen/Jost) and [Sacramento](https://fonts.google.com/specimen/Sacramento) load from Google Fonts in `index.html`.
- **Animations** turn off automatically for guests whose phones have "reduce motion" enabled.
