"""Haalt het Wobbly Sun-logo en de scribbelzon als SVG uit het manifest-PDF in de vault.
Gebruik: python3 scripts/wobbly-svg.py  (vereist pymupdf). Schrijft public/wobbly-sun-logo.svg en public/wobbly-sun-zon.svg."""
import os
import pymupdf as fitz

PDF = '/Users/raymond/Documents/Mijn kennisbibliotheek/bronnen/documenten/2026-09-28 - Wobbly Sun manifest.pdf'
BIC = '#1226AA'
p = fitz.open(PDF)[0]
tek = p.get_drawings()
logo = tek[26:60]   # woordmerk (26-34) en scribbelzon (35-59), rechtsonder op de pagina
zon = tek[35:60]

def f(v):
    return ('%.2f' % v).rstrip('0').rstrip('.')

def svg(dr, label):
    x0 = min(d['rect'].x0 for d in dr); y0 = min(d['rect'].y0 for d in dr)
    x1 = max(d['rect'].x1 for d in dr); y1 = max(d['rect'].y1 for d in dr)
    def pad(d):
        out, cur = [], None
        for it in d['items']:
            k = it[0]
            if k == 'l':
                a, b = it[1], it[2]
                if cur is None or abs(cur.x - a.x) > .01 or abs(cur.y - a.y) > .01:
                    out.append('M%s %s' % (f(a.x - x0), f(a.y - y0)))
                out.append('L%s %s' % (f(b.x - x0), f(b.y - y0))); cur = b
            elif k == 'c':
                a, c1, c2, b = it[1:5]
                if cur is None or abs(cur.x - a.x) > .01 or abs(cur.y - a.y) > .01:
                    out.append('M%s %s' % (f(a.x - x0), f(a.y - y0)))
                out.append('C%s %s %s %s %s %s' % (f(c1.x - x0), f(c1.y - y0), f(c2.x - x0), f(c2.y - y0), f(b.x - x0), f(b.y - y0))); cur = b
            elif k == 're':
                r = it[1]; out.append('M%s %sH%sV%sH%sZ' % (f(r.x0 - x0), f(r.y0 - y0), f(r.x1 - x0), f(r.y1 - y0), f(r.x0 - x0)))
        if d.get('closePath'): out.append('Z')
        return ''.join(out)
    delen = ''.join('<path fill-rule="%s" d="%s"/>' % ('evenodd' if d.get('even_odd') else 'nonzero', pad(d)) for d in dr)
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" fill="%s" role="img" aria-label="%s">%s</svg>\n' % (f(x1 - x0), f(y1 - y0), BIC, label, delen)

pub = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
open(os.path.join(pub, 'wobbly-sun-logo.svg'), 'w').write(svg(logo, 'Wobbly Sun'))
open(os.path.join(pub, 'wobbly-sun-zon.svg'), 'w').write(svg(zon, 'Een wiebelige zon'))
