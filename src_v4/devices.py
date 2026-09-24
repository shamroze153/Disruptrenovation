"""Phone / tablet screenshots + layout audit (overflow, touch targets, text size).
usage: devices.py <html> <outdir> [modes]   modes: comma list of home,sheet,walk,map,arch,menu"""
import asyncio, sys, json, os
from playwright.async_api import async_playwright
HTML, OUT = sys.argv[1], sys.argv[2]
MODES = (sys.argv[3] if len(sys.argv) > 3 else "home").split(",")
DEV = sys.argv[4].split(",") if len(sys.argv) > 4 else None
DEVICES = [("iPhone SE", 375, 667, 2), ("iPhone 14", 390, 844, 3), ("Pixel 7", 412, 915, 2.625), ("iPad", 768, 1024, 2)]
UA = {"iPad": "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "iPhone": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Pixel": "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36"}
AUDIT = r"""(() => { const W = innerWidth, H = innerHeight, out = { W, H, scrollW: document.documentElement.scrollWidth, bodyScrollW: document.body.scrollWidth, over: [], small: [], tiny: [] };
  const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')) + (e.textContent ? ' "' + e.textContent.trim().slice(0, 22) + '"' : '');
  const shown = (e) => { for (let q = e; q && q !== document.body; q = q.parentElement) { const cs = getComputedStyle(q); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || q.hidden) return false; } return true; };
  const inHScroll = (e) => { for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) { const cs = getComputedStyle(q); if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && q.scrollWidth > q.clientWidth) return true; } return false; };
  const inViewY = (r) => r.bottom > 0 && r.top < H;
  document.querySelectorAll('body *').forEach(e => { if (!shown(e)) return; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    if (['CANVAS', 'svg'].includes(e.tagName) && e.closest('#stage,#labels')) return;
    if (e.closest('#labels') || e.closest('.atag')) return;
    if (inViewY(r) && (r.right > W + 1 || r.left < -1) && !inHScroll(e)) out.over.push(name(e) + ' [' + Math.round(r.left) + ',' + Math.round(r.right) + ']');
    const tag = e.tagName, interactive = tag === 'BUTTON' || tag === 'SELECT' || (tag === 'INPUT' && !['checkbox', 'radio', 'hidden'].includes(e.type)) || e.getAttribute('role') === 'button' || tag === 'A';
    if (interactive && inViewY(r) && (r.width < 43.5 || r.height < 43.5)) out.small.push(name(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (tag === 'INPUT' && (e.type === 'checkbox' || e.type === 'radio') && inViewY(r)) { const l = e.closest('label'); const lr = l ? l.getBoundingClientRect() : r; if (lr.height < 43.5) out.small.push('label ' + name(l || e) + ' ' + Math.round(lr.width) + 'x' + Math.round(lr.height)); }
    const hasText = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (hasText && inViewY(r) && parseFloat(getComputedStyle(e).fontSize) < 13.95) out.tiny.push(name(e) + ' ' + getComputedStyle(e).fontSize);
  });
  out.over = [...new Set(out.over)].slice(0, 30); out.small = [...new Set(out.small)].slice(0, 40); out.tiny = [...new Set(out.tiny)].slice(0, 40); return out; })()"""
STEPS = {
    "home": "0",
    "sheet": "document.getElementById('sheetHandle') && document.getElementById('sheetHandle').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientY:500,pointerId:1})) , document.getElementById('sheetHandle') && document.getElementById('sheetHandle').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientY:500,pointerId:1}))",
    "walk": "window.__api.enterWalk(); window.__api.walkTo('GF',88.75,34,0,-0.05)",
    "map": "window.__api.exitWalk && window.__api.exitWalk(); window.__api.openMap('GF')",
    "arch": "window.__api.closeMap && window.__api.closeMap(); window.__api.arch(true)",
    "menu": "window.__api.arch && window.__api.arch(false); document.getElementById('moreBtn').click()",
    "way": "window.__api.closeMap && window.__api.closeMap(); window.__api.arch && window.__api.arch(false); document.getElementById('topMenu').classList.remove('open'); window.__way.go('cafeteria',{start:{f:'GF',x:91.04,y:1.8,name:'Main gate',kind:'gate'},view:'bird'})",
    "waysteps": "document.getElementById('wayList').click()",
    "waypanel": "window.__way.wayEnd(); window.__api.exitWalk(); window.__way.wayOpen()",
    "solar": "window.__way.wayClose(); window.__solar.view()",
    "solarwalk": "window.__solar.walk(true)",
    "share": "window.__solar.walk(false); window.__api.exitWalk(); window.__solar.set(false); window.__x.shareOpen()",
}
async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        report = {}
        for (dn, w, h, dpr) in DEVICES:
            if DEV and dn not in DEV: continue
            for orient in ("portrait", "landscape"):
                vw, vh = (w, h) if orient == "portrait" else (h, w)
                ua = UA["iPad"] if dn == "iPad" else UA["iPhone"] if dn.startswith("iPhone") else UA["Pixel"]
                ctx = await b.new_context(viewport={"width": vw, "height": vh}, device_scale_factor=dpr, is_mobile=True, has_touch=True, user_agent=ua)
                pg = await ctx.new_page(); errs = []
                pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)[:200]))
                pg.on("console", lambda m: errs.append(m.type + " " + m.text[:160]) if m.type in ("error", "warning") and "ReadPixels" not in m.text else None)
                await pg.goto("file://" + os.path.abspath(HTML) + "?q=low", wait_until="commit", timeout=0)
                await pg.wait_for_function("window.__ready===true", timeout=900000)
                for m in MODES:
                    await pg.evaluate(STEPS[m]); await pg.wait_for_timeout(1800)
                    a = await pg.evaluate(AUDIT)
                    fn = f"{OUT}/{dn.replace(' ', '_')}_{orient}_{m}.png"
                    await pg.screenshot(path=fn, timeout=600000)
                    report[f"{dn} {orient} {m}"] = a
                    print(dn, orient, m, "scrollW", a["scrollW"], "W", a["W"], "over", len(a["over"]), "small", len(a["small"]), "tiny", len(a["tiny"]), flush=True)
                report[f"{dn} {orient} errors"] = errs[:10]
                await ctx.close()
        json.dump(report, open(f"{OUT}/audit.json", "w"), indent=1)
        await b.close()
asyncio.run(main())
