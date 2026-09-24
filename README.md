# Disrupt 141-C — 3D building viewer v4.0

A 3D walkthrough of the Disrupt 141-C building, with a building map, wayfinding, an emergency exit route, and a rooftop solar concept.
Made by **Engr. Shamroze Nasir**.

- Open `index.html`. It is the same file as `Disrupt_141C_viewer_v4.0.html`, fully self-contained, and works offline.
- Details are in `HANDOFF_v4.md`: features, deep links, the solar study and the QA results.

## Deploy on Vercel
1. Push this folder to a GitHub repository, with the files at the repo root.
2. On vercel.com, choose **Add New → Project** and import the repository.
3. Set the framework preset to **Other**. Leave the build command empty and set the output directory to `./`.
4. Click **Deploy**. The site opens at `https://<project>.vercel.app/`.

After deploying, open the viewer and go to ☰ → **QR codes for every department**. Enter the Vercel address and press **Update codes**, then print the sheet.

Deep link examples:
- `/?to=board-room`
- `/?to=cafeteria&go=1`
- `/?sos=1&from=reception`

## v4.1 — performance fix (hanging and lag)
- **Shader compilation no longer freezes the page.** three.js read the shader logs synchronously every time a new material was used (entering walk mode, changing floors), which forced the browser to wait for each compile. That is now off, and the walk-mode materials are compiled in the background right after loading. In the test this removed about 19 s of blocking.
- **Dynamic resolution bug fixed.** Frames capped at 30 fps while idle were counted as "slow", so the resolution kept dropping and the canvas was resized every second while you moved, which caused stutter. Only real, back-to-back frames count now, and the resolution comes back up.
- **Auto quality is lighter.** Laptops now start on **Medium** (not High) and phones on **Low**. If a device is still too slow, Auto steps down on its own. High is still available in the panel.
- **Offline cache:** the page is now fetched from the network first, so a new deploy shows up immediately.
- If a browser still shows the old version: hard refresh once (Ctrl+Shift+R), or clear the site data.
