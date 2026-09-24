import base64, pathlib, re
b64 = base64.b64encode(open("Disrupt_141C.glb","rb").read()).decode()
body = open("viewer_body.html").read()
css  = open("style.css").read()
three= open("three_bundle.js").read()
app  = open("viewer_app.js").read()

# artifact skeleton pads :root with the safe-area insets; fixed bars must add their own
css = css.replace("#hud{position:fixed;top:0;left:0;right:0;",
                  "#hud{position:fixed;top:0;left:0;right:0;padding-top:calc(16px + env(safe-area-inset-top,0px));")
css = css.replace("#panel{position:fixed;top:78px;",
                  "#panel{position:fixed;top:calc(78px + env(safe-area-inset-top,0px));")
css = css.replace("#readout{position:fixed;bottom:16px;",
                  "#readout{position:fixed;bottom:calc(16px + env(safe-area-inset-bottom,0px));")
css += "\n@media (prefers-reduced-motion: reduce){ .spin{animation:none} *{transition:none!important} }\n"

html = f"""<title>Disrupt 141-C Model</title>
<style>{css}</style>
{body}
<script>window.MODEL_B64="{b64}";</script>
<script>{three}</script>
<script>{app}</script>"""
pathlib.Path("artifact.html").write_text(html)
print("artifact.html", round(len(html)/1e6,2), "MB")
