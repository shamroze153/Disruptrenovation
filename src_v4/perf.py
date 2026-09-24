"""Measure a viewer build: load time, renderer.info per scene, fps.
usage: perf.py <html> <label> [phone]
Headless Chromium here has no GPU (SwiftShader, software WebGL), so fps is a relative number only;
draw calls / triangles / textures / sizes are exact."""
import asyncio, sys, json, time, os
from playwright.async_api import async_playwright
HTML, LABEL = sys.argv[1], sys.argv[2]
PHONE = len(sys.argv) > 3 and sys.argv[3] == 'phone'
QS = sys.argv[4] if len(sys.argv) > 4 else ""
SCENES = [
    ("orbit (front 3/4)", "window.__api.setView('front34')"),
    ("walk (reception)", "window.__api.enterWalk(); window.__api.walkTo('GF',88.75,34,0,-0.05)"),
    ("walk (FF workstations)", "window.__api.walkTo('FF',93.75,112,1.57,-0.1)"),
    ("architect (GF cut)", "window.__api.exitWalk(); window.__api.arch(true)"),
]
FPS_JS = """(ms) => new Promise(res => { let n = 0, t0 = performance.now(), worst = 0, last = t0;
  function f(t) { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else res({ fps: n * 1000 / (t - t0), worst_ms: worst }); }
  requestAnimationFrame(f); })"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        if PHONE:
            ctx = await b.new_context(viewport={"width": 412, "height": 915}, device_scale_factor=2.625, is_mobile=True, has_touch=True,
                                      user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")
        else:
            ctx = await b.new_context(viewport={"width": 1440, "height": 900})
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)[:200]))
        pg.on("console", lambda m: errs.append(m.type + " " + m.text[:200]) if m.type in ("error", "warning") else None)
        if PHONE:
            cdp = await ctx.new_cdp_session(pg); await cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        t0 = time.time()
        await pg.goto("file://" + os.path.abspath(HTML) + QS, wait_until="commit", timeout=0)
        tdom = time.time() - t0
        await pg.wait_for_load_state("domcontentloaded", timeout=0); tdom = time.time() - t0
        first = None
        try:
            await pg.wait_for_function("window.__firstFrame===true || window.__ready===true", timeout=600000)
            first = time.time() - t0
        except Exception: pass
        await pg.wait_for_function("window.__ready===true", timeout=600000)
        tready = time.time() - t0
        out = {"label": LABEL, "html_MB": round(os.path.getsize(HTML) / 1e6, 2), "domcontent_s": round(tdom, 1),
               "first_view_s": round(first, 1) if first else None, "ready_s": round(tready, 1), "scenes": []}
        nav = await pg.evaluate("JSON.stringify(performance.getEntriesByType('navigation')[0] || {})")
        heap = await pg.evaluate("performance.memory ? Math.round(performance.memory.usedJSHeapSize/1e6) : null")
        out["js_heap_MB"] = heap
        for name, js in SCENES:
            await pg.evaluate(js); await pg.wait_for_timeout(2500)
            has_b = await pg.evaluate("typeof window.__bench === 'function'")
            info = await pg.evaluate("window.__perf()")
            bench = await pg.evaluate("window.__bench(3)") if has_b else {}
            if not has_b:
                fps = await pg.evaluate(FPS_JS, 6000); bench = {"fps_raf": round(fps["fps"], 1)}
            out["scenes"].append({"scene": name, **info, "bench": bench})
        out["errors"] = errs[:15]
        print(json.dumps(out, indent=1))
        json.dump(out, open(f"/home/claude/v4/perf_{LABEL}.json", "w"), indent=1)
        await b.close()
asyncio.run(main())
