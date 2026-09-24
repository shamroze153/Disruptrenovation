"""run a list of [js, wait_ms, shot] steps; usage: steps.py <html?qs> <steps.json> <outdir> [w h] [phone]"""
import asyncio, sys, json, os
from playwright.async_api import async_playwright
async def main():
    url, steps, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
    w = int(sys.argv[4]) if len(sys.argv) > 4 else 1280; h = int(sys.argv[5]) if len(sys.argv) > 5 else 800
    phone = len(sys.argv) > 6 and sys.argv[6] == "phone"
    os.makedirs(out, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        kw = dict(viewport={"width": w, "height": h})
        if phone: kw.update(device_scale_factor=2, is_mobile=True, has_touch=True, user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")
        ctx = await b.new_context(**kw); pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)[:300]))
        pg.on("console", lambda m: errs.append(m.type + " " + m.text[:300]) if m.type in ("error", "warning") and "ReadPixels" not in m.text and "GPU stall" not in m.text else None)
        f = url.split("?")[0]; q = ("?" + url.split("?", 1)[1]) if "?" in url else ""
        await pg.goto("file://" + os.path.abspath(f) + q, wait_until="commit", timeout=0)
        await pg.wait_for_function("window.__ready===true", timeout=900000)
        for js, wait, shot in steps:
            try:
                if js.startswith("CLICK "):
                    _, cx, cy = js.split(); await pg.mouse.click(float(cx), float(cy)); r = None
                else: r = await pg.evaluate(js)
                if r is not None: print(json.dumps(r, ensure_ascii=False)[:1800], flush=True)
            except Exception as e: print("ERR", str(e)[:300], flush=True)
            if wait: await pg.wait_for_timeout(wait)
            if shot: await pg.screenshot(path=f"{out}/{shot}.png", timeout=600000); print("shot", shot, flush=True)
        print("CONSOLE:", "\n".join(errs[:15])); await b.close()
asyncio.run(main())
