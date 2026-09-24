import base64, pathlib
b64 = base64.b64encode(open("Disrupt_141C.glb","rb").read()).decode()
body = open("viewer_body.html").read()
css  = open("style.css").read()
three= open("three_bundle.js").read()
app  = open("viewer_app.js").read()
html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Disrupt 141-C Model</title>
<style>{css}</style>
</head>
<body>
{body}
<script>window.MODEL_B64="{b64}";</script>
<script>{three}</script>
<script>{app}</script>
</body>
</html>"""
pathlib.Path("index.html").write_text(html)
print("index.html", len(html)/1e6, "MB")
