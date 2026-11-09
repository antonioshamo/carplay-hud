#!/usr/bin/env python3
"""Rebuild the instrument atlas from the unmodified OFL Russo One TTF.

Requires Pillow. Pass the local TTF as the only argument. The expected upstream
source is https://raw.githubusercontent.com/google/fonts/main/ofl/russoone/RussoOne-Regular.ttf
"""
import base64
import hashlib
import json
import pathlib
import sys
import zlib
from PIL import Image, ImageDraw, ImageFont

SOURCE_SHA = 'bc0abcc660bd8b7ad3000ecb2898a27c58a29a50f7ec81652fa12e75148d09df'
source = pathlib.Path(sys.argv[1])
if hashlib.sha256(source.read_bytes()).hexdigest() != SOURCE_SHA:
    raise SystemExit('Unexpected Russo One source; inspect it before changing the pinned hash')
charset = ''.join(chr(c) for c in range(32, 127)) + '°—'
sizes = []
for size in (20, 28, 40, 64, 88):
    font = ImageFont.truetype(str(source), size)
    ascent, descent = font.getmetrics()
    items, glyphs = [], {}
    x = y = row_height = 0
    for ch in charset:
        left, top, right, bottom = font.getbbox(ch, anchor='ls')
        width, height = max(0, right-left), max(0, bottom-top)
        if width and height:
            if x + width > 1024:
                x, y, row_height = 0, y+row_height+1, 0
            glyph = Image.new('L', (width, height))
            ImageDraw.Draw(glyph).text((-left, -top), ch, font=font, fill=255, anchor='ls')
            items.append((glyph, x, y))
            glyphs[ord(ch)] = [x, y, width, height, left, top, round(font.getlength(ch), 2)]
            x += width+1
            row_height = max(row_height, height)
        else:
            glyphs[ord(ch)] = [0, 0, 0, 0, left, top, round(font.getlength(ch), 2)]
    atlas = Image.new('L', (1024, y+row_height+1))
    for glyph, x, y in items:
        atlas.paste(glyph, (x, y))
    sizes.append(dict(size=size, ascent=ascent, descent=descent, atlasW=atlas.width,
        atlasH=atlas.height, alpha=base64.b64encode(zlib.compress(atlas.tobytes(), 9)).decode(),
        glyphs=glyphs, key='RussoOne-bc0abcc6-full@'+str(size)))
data = dict(family='Russo One', sourceSha256=SOURCE_SHA, sizes=sizes)
target = pathlib.Path(__file__).resolve().parents[1]/'src/font_cluster.js'
target.write_text('// SPDX-License-Identifier: OFL-1.1\n// Russo One, unmodified glyphs. See LICENSE-RussoOne.txt.\nmodule.exports = '+json.dumps(data,separators=(',',':'))+';\n')
