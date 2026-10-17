"""
Regenerates data/rubik-800-widths.json: advance widths (in em) of Rubik at weight 800 — the
weight secret words use on the role card. The content validator uses it to prove every word fits
the card at the 44px minimum (CLAUDE.md §6.3) without needing a browser.

Usage (needs Python + fontTools): python scripts/font-widths.py
"""
import io
import json
import re
import urllib.request
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

CSS_URL = "https://fonts.googleapis.com/css2?family=Rubik:wght@800"
CHARS = (
    "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"
    "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"
    "ӨөҮү"
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789 -'.,!?"
)


def fetch(url):
    # A plain user agent makes Google Fonts serve TrueType, which fontTools reads without brotli.
    req = urllib.request.Request(url, headers={"User-Agent": "curl/8.4.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


css = fetch(CSS_URL).decode("utf-8")
url = re.search(r"url\((.*?)\)", css).group(1)
font = TTFont(io.BytesIO(fetch(url)))
# Plain user agents get a static instance; pin the weight if Google sends the variable file.
if "fvar" in font:
    font = instantiateVariableFont(font, {"wght": 800})
upem = font["head"].unitsPerEm
cmap = font.getBestCmap()
hmtx = font["hmtx"]

widths = {}
for ch in CHARS:
    glyph = cmap.get(ord(ch))
    if glyph is None:
        raise SystemExit(f"Rubik 800 has no glyph for {ch!r}")
    widths[ch] = round(hmtx[glyph][0] / upem, 4)

out = Path(__file__).resolve().parent.parent / "data" / "rubik-800-widths.json"
out.parent.mkdir(exist_ok=True)
out.write_text(
    json.dumps({"font": "Rubik", "weight": 800, "unitsPerEm": upem, "widths": widths},
               ensure_ascii=False, indent=1) + "\n",
    encoding="utf-8",
)
print(f"wrote {len(widths)} widths to {out}")
