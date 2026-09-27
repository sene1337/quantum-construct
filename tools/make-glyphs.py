"""Write data/glyphs.json: Playfair Display Black outlines for the numbers and words cast in metal.

Usage (needs fontTools and brotli):  python3 tools/make-glyphs.py
The characters come from CHARS below. Coordinates are in font units scaled to an em of 1000, y up, in the same
format as the Sovereignty simulator's data/sim-glyphs.json: an advance, then M/L/Q/C commands.
"""
import json
import os

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'fonts', 'playfair-display-latin-900-normal.woff2')
OUT = os.path.join(ROOT, 'data', 'glyphs.json')
CHARS = " 0123456789,.%+=~'’−–×²³?!<" \
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ" "xyk"


class CmdPen(BasePen):
    def __init__(self, glyphset, k):
        super().__init__(glyphset)
        self.k = k
        self.cmds = []

    def r(self, v):
        v = round(v * self.k, 1)
        return int(v) if v == int(v) else v

    def _moveTo(self, p):
        self.cmds.append(['M', self.r(p[0]), self.r(p[1])])

    def _lineTo(self, p):
        self.cmds.append(['L', self.r(p[0]), self.r(p[1])])

    def _qCurveToOne(self, p1, p2):
        self.cmds.append(['Q', self.r(p1[0]), self.r(p1[1]), self.r(p2[0]), self.r(p2[1])])

    def _curveToOne(self, p1, p2, p3):
        self.cmds.append(['C', *[self.r(v) for p in (p1, p2, p3) for v in p]])

    def _closePath(self):
        pass

    def _endPath(self):
        pass


def main():
    font = TTFont(FONT)
    upm = font['head'].unitsPerEm
    k = 1000.0 / upm
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    hmtx = font['hmtx']
    out = {'unitsPerEm': 1000,
           'source': 'Playfair Display Black, SIL Open Font License 1.1 (fonts/LICENSE-playfair-display.txt)',
           'glyphs': {}}
    names = set(font.getGlyphOrder())
    digits = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
    # Lining figures (the font's default figures are old-style), and superior figures for exponents.
    special = {str(i): d + '.lf' for i, d in enumerate(digits)}
    sups = {'⁰': 'zero.sups', '¹': 'uni00B9', '²': 'uni00B2', '³': 'uni00B3'}
    for i in range(4, 10):
        sups[chr(0x2070 + i)] = digits[i] + '.sups'
    special.update(sups)
    missing = []
    for ch in CHARS + ''.join(sups):
        name = special.get(ch) if special.get(ch) in names else cmap.get(ord(ch))
        if name is None:
            missing.append(ch)
            continue
        pen = CmdPen(gs, k)
        gs[name].draw(pen)
        out['glyphs'][ch] = {'advance': round(hmtx[name][0] * k), 'cmds': pen.cmds}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print('wrote', OUT, os.path.getsize(OUT), 'bytes;', len(out['glyphs']), 'glyphs; missing:', missing, '; upm', upm)


if __name__ == '__main__':
    main()
