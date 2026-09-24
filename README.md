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
