import asyncio, pathlib, html, re
from playwright.async_api import async_playwright
B = pathlib.Path("/mnt/user-data/outputs/DISRUPT_141C_COMPLETE")

def md_to_html(md, title):
    lines = md.split("\n"); out = []; in_code = False
    for ln in lines:
        if ln.startswith("```"):
            in_code = not in_code; out.append("<pre>" if in_code else "</pre>"); continue
        if in_code: out.append(html.escape(ln)); continue
        e = html.escape(ln)
        e = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", e)
        if ln.startswith("# "): out.append(f"<h1>{e[2:]}</h1>")
        elif ln.startswith("## "): out.append(f"<h2>{e[3:]}</h2>")
        elif ln.startswith("### "): out.append(f"<h3>{e[4:]}</h3>")
        elif ln.startswith("---"): out.append("<hr>")
        elif ln.strip()=="" : out.append("<p></p>")
        else: out.append(f"<div class=l>{e}</div>")
    return f"""<!doctype html><meta charset=utf-8><title>{html.escape(title)}</title>
<style>
@page{{margin:16mm 14mm}}
body{{font:10.5pt/1.5 "DejaVu Sans",Helvetica,Arial,sans-serif;color:#15181c}}
h1{{font-size:19pt;margin:0 0 4pt;border-bottom:2px solid #2f5d7c;padding-bottom:6pt}}
h2{{font-size:13pt;margin:16pt 0 4pt;color:#2f5d7c}}
h3{{font-size:11pt;margin:11pt 0 3pt}}
pre{{background:#f4f5f6;padding:7pt;border-left:3px solid #c3ccd2;white-space:pre-wrap;font:9pt/1.45 "DejaVu Sans Mono",monospace}}
.l{{white-space:pre-wrap;margin:0}}
hr{{border:0;border-top:1px solid #d7dcdf;margin:14pt 0}}
</style>{chr(10).join(out)}"""

JOBS = [
  (B/"02_briefs/prompt_1_phase1_brief.md", B/"02_briefs/Chat_Prompt_1.pdf", "Prompt 1 — Phase 1 brief"),
  (B/"02_briefs/prompt_2_phases_2to9_brief.md", B/"02_briefs/Chat_Prompt_2.pdf", "Prompt 2 — Phases 2-9 brief"),
  (B/"03_reports/FULL_PROJECT_REPORT.md", B/"03_reports/FULL_PROJECT_REPORT.pdf", "Disrupt 141-C Full Project Report"),
  (B/"00_START_HERE.md", B/"00_START_HERE.pdf", "Disrupt 141-C Archive Guide"),
]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        for src, dst, title in JOBS:
            await pg.set_content(md_to_html(src.read_text(), title), wait_until="load")
            await pg.pdf(path=str(dst), format="A4", print_background=True)
            print("  ->", dst.name, dst.stat().st_size//1024, "KB", flush=True)
        await b.close()
asyncio.run(main())
