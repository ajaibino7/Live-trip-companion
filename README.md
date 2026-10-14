# Mumbai + Lonavala Trip

A live trip companion for the 17–20 October Mumbai + Lonavala itinerary. It's a static
site (plain HTML, CSS and JavaScript, no build step), so it runs on GitHub Pages as-is.

## What it does

- **Live status:** works out the current and next activity from the time in India (IST),
  whatever timezone your phone is set to.
- **Location aware:** with location on, it compares where you are with where the plan says
  you should be. It shows *On track*, *Running behind*, *Ahead* or *~N min late*, the distance
  to the next stop, and a rough travel time.
- **Train deadline:** on Day 4 it counts down to a "leave by" time for Lokmanya Tilak
  Terminus based on how far away you are.
- **Map:** the selected day's stops, the route between them, and your position.
- **Done / skip:** tap any stop to get directions or mark it done. Skipped stops drop out of
  the live status. This is saved on your device only.
- **Installable and offline:** add it to your home screen. The app and any map areas you've
  viewed keep working with a weak signal.

Your location stays on your device. Nothing is uploaded anywhere.

## Deploy to GitHub Pages

1. Create a new repository on GitHub, for example `mumbai-lonavala-trip`.
2. Push this folder to it:
   ```bash
   git remote add origin https://github.com/<your-username>/mumbai-lonavala-trip.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages**. Under **Build and deployment**, set the source to
   **Deploy from a branch**, then choose `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/mumbai-lonavala-trip/`.

Location only works over HTTPS, which GitHub Pages provides.

## Editing the itinerary

Everything lives in [`js/data.js`](js/data.js): times, titles, notes and coordinates.

Some places are marked `approx: true` because they don't have an exact map pin. These are the
hotel in Fort, the Lonavala Airbnb, Rajmachi Point, Tiger Point, and your Bandra stay. Replace
their `lat`/`lng` with the real pin (in Google Maps, long-press the spot and copy the
coordinates) so "You're here" detection is accurate. `radius` is how close, in metres, you need
to be to count as being at the stop.

After changing files, bump `CACHE` in `sw.js` (for example `mlt-v2`) so installed copies pick
up the update.

## Testing before the trip

Add these to the URL to simulate a time and/or a place:

| Parameter | Example | Effect |
|---|---|---|
| `now` | `?now=2026-10-18T12:15` | Pretend it's this time (IST); the clock keeps ticking |
| `lat`, `lng` | `&lat=18.7041&lng=73.3876` | Pretend you're at this location |

For example, `?now=2026-10-20T16:50&lat=19.0863&lng=72.8892` shows the Day 4 "leave for LTT"
warning from Phoenix Marketcity.

To run it locally (ES modules need a web server rather than `file://`):

```bash
python -m http.server 8080
```

Then open http://localhost:8080.
