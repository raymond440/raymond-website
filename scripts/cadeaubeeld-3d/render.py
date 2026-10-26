"""Fotorealistisch cadeaubeeld met Mitsuba 3 (path tracer).
Gebruik: python render.py <spp> <uitvoer.png>  (variant metal_ad_rgb of scalar_rgb)
Etiket en deksel komen uit etiket.png en deksel-rond.png in deze map."""
import sys, os, math
import numpy as np
from PIL import Image, ImageFilter
import mitsuba as mi
try: mi.set_variant(os.environ.get('MIVAR','scalar_rgb'))
except Exception: mi.set_variant('scalar_rgb')

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = '/private/tmp/claude-501/mi'
SPP = int(sys.argv[1]) if len(sys.argv) > 1 else 64
OUT = sys.argv[2] if len(sys.argv) > 2 else WORK + '/out.png'
RES = 1200
rng = np.random.default_rng(7)

# ---------- texturen ----------
def save(a, name):
    p = f'{WORK}/{name}'; Image.fromarray(np.clip(a, 0, 255).astype('uint8')).save(p); return p

def kraft(n=1024):
    base = np.array([226, 190, 140.])
    g = rng.normal(0, 1, (n, n))
    lo = np.array(Image.fromarray(((g - g.min()) / (g.max() - g.min()) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(18))).astype(float)
    lo = (lo - lo.mean()) / (lo.std() + 1e-6)
    fine = rng.normal(0, 1, (n, n))
    # vezels: langwerpig
    fib = np.zeros((n, n))
    for _ in range(1800):
        x, y = rng.integers(0, n, 2); l = rng.integers(8, 40); a = rng.uniform(-.2, .2)
        for t in range(l):
            xx = int(x + t * math.cos(a)) % n; yy = int(y + t * math.sin(a)) % n; fib[yy, xx] += rng.choice([-1, 1])
    v = lo * 3.5 + fine * 1.5 + fib * 2.5
    img = base[None, None, :] + v[..., None] * np.array([1, .9, .75])
    return img, v

img, v = kraft(); kraft_p = save(img, 'kraft.png'); kraft_b = save(128 + v * 4, 'kraft_b.png')

def honeycomb(n=1024, cells=7):
    s = n / cells / 1.5; h = s * math.sqrt(3) / 2
    yy, xx = np.mgrid[0:n, 0:n].astype(float)
    # afstand tot dichtstbijzijnde celmiddelpunt (zeshoekig rooster)
    def dist(ox, oy):
        px = (xx - ox) / s; py = (yy - oy) / s
        return np.maximum(np.abs(py) * 2 / math.sqrt(3), np.abs(px) + np.abs(py) / math.sqrt(3))
    d = np.full((n, n), 9.)
    for col in range(-1, int(n / (1.5 * s)) + 2):
        for row in range(-1, int(n / (2 * h)) + 2):
            cx = col * 1.5 * s; cy = row * 2 * h + (h if col % 2 else 0)
            # tegel onafhankelijk: neem lokaal
            x0, x1 = int(max(0, cx - s * 1.1)), int(min(n, cx + s * 1.1)); y0, y1 = int(max(0, cy - s * 1.1)), int(min(n, cy + s * 1.1))
            if x0 >= x1 or y0 >= y1: continue
            px = (xx[y0:y1, x0:x1] - cx) / s; py = (yy[y0:y1, x0:x1] - cy) / s
            dd = np.maximum(np.abs(py) * 2 / math.sqrt(3), np.abs(px) + np.abs(py) / math.sqrt(3))
            d[y0:y1, x0:x1] = np.minimum(d[y0:y1, x0:x1], dd)
    wall = np.clip((d - .82) / .06, 0, 1)         # 1 = celwand, 0 = open cel
    wall = np.array(Image.fromarray((wall * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))).astype(float) / 255
    k = np.array(Image.open(kraft_p).resize((n, n))).astype(float)
    cell_col = np.array([150, 111, 70.]) * (0.72 + 0.28 * (1 - np.clip(d, 0, 1)))[..., None]
    col = cell_col * (1 - wall[..., None]) + (k * 1.08) * wall[..., None]
    return col, wall
hc, wall = honeycomb(); hex_p = save(hc, 'hex.png'); hex_b = save(wall * 255, 'hex_b.png')

# ---------- meshes (OBJ) ----------
def write_obj(name, V, N, UV, F):
    p = f'{WORK}/{name}.obj'
    with open(p, 'w') as f:
        for v in V: f.write('v %.5f %.5f %.5f\n' % tuple(v))
        for n in N: f.write('vn %.5f %.5f %.5f\n' % tuple(n))
        for t in UV: f.write('vt %.5f %.5f\n' % tuple(t))
        for a, b, c in F: f.write(f'f {a+1}/{a+1}/{a+1} {b+1}/{b+1}/{b+1} {c+1}/{c+1}/{c+1}\n')
    return p

def box_mesh(name, x0, x1, y0, y1, z0, z1, period=6.0, bevel=0.0):
    V, N, UV, F = [], [], [], []
    def face(pts, n, uvax):
        i = len(V)
        for p in pts:
            V.append(p); N.append(n); UV.append((p[uvax[0]] / period, p[uvax[1]] / period))
        F.extend([(i, i + 1, i + 2), (i, i + 2, i + 3)])
    X = (x0, x1); Y = (y0, y1); Z = (z0, z1)
    face([(x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0)], (0, 1, 0), (0, 2))   # boven
    face([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0), (0, 2))
    face([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1), (0, 1))
    face([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], (0, 0, -1), (0, 1))
    face([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], (1, 0, 0), (2, 1))
    face([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], (-1, 0, 0), (2, 1))
    return write_obj(name, V, N, UV, F)

def lathe(name, prof, ox, oy, oz, nseg=160, th0=0, th1=2*math.pi, uvfun=None, flip=False):
    """prof: lijst (x_langs_as, straal). As loopt langs +x. Normaal naar buiten."""
    P = np.array(prof, float); m = len(P); V, N, UV, F = [], [], [], []
    t = np.gradient(P, axis=0); 
    for j, (x, r) in enumerate(P):
        dx, dr = t[j]; ln = math.hypot(dx, dr) or 1; nx, nr = -dr / ln, dx / ln     # normaal in (x,r)
        for i in range(nseg + 1):
            th = th0 + (th1 - th0) * i / nseg
            c, s = math.cos(th), math.sin(th)
            V.append((ox + x, oy + r * c, oz + r * s)); N.append((nx, nr * c, nr * s))
            UV.append(uvfun(i / nseg, j / (m - 1), x, r) if uvfun else (i / nseg, j / (m - 1)))
    for j in range(m - 1):
        for i in range(nseg):
            a = j * (nseg + 1) + i; b = a + 1; c = a + nseg + 1; d = c + 1
            F.extend([(a, c, b), (b, c, d)])
    # oriënteer: normaal moet naar buiten wijzen
    V2 = np.array(V); N2 = np.array(N); Fo = []
    for a, b, c in F:
        fn = np.cross(V2[b] - V2[a], V2[c] - V2[a]); 
        Fo.append((a, c, b) if np.dot(fn, N2[a]) < 0 else (a, b, c))
    if flip: Fo = [(a, c, b) for a, b, c in Fo]; N = [(-x, -y, -z) for x, y, z in N]
    return write_obj(name, V, N, UV, Fo)

def disk(name, x, r, ox, oy, oz, nseg=160, dirn=1, rot=0.0):
    V = [(ox + x, oy, oz)]; N = [(dirn, 0, 0)]; UV = [(.5, .5)]; F = []
    for i in range(nseg + 1):
        th = 2 * math.pi * i / nseg
        c, s = math.cos(th), math.sin(th)
        V.append((ox + x, oy + r * c, oz + r * s)); N.append((dirn, 0, 0))
        a = th + rot
        UV.append((.5 + .5 * math.cos(a), .5 + .5 * math.sin(a)))
    for i in range(nseg):
        F.append((0, i + 1, i + 2) if dirn > 0 else (0, i + 2, i + 1))
    V2 = np.array(V); Fo = []
    for a, b, c in F:
        fn = np.cross(V2[b] - V2[a], V2[c] - V2[a]); Fo.append((a, b, c) if fn[0] * dirn > 0 else (a, c, b))
    return write_obj(name, V, N, UV, Fo)

# ---------- afmetingen (cm) ----------
IW, ID, T, WH = 14.6, 19.2, .45, 4.4
FL, FH = .5, .7; top = FL + FH
R = 3.1; L = 6.3; gap = .35
zc = [-(R + gap / 2 + 1.0), (R + gap / 2 + 1.0)]
axis = top + R; bh = axis - top + .1
ox = -0.9

shapes = {}
def add(name, obj, bsdf, extra=None):
    d = {'type': 'obj', 'filename': obj, 'bsdf': bsdf}
    if extra: d.update(extra)
    shapes[name] = d

def tex(path, raw=False, scale=1.0):
    return {'type': 'bitmap', 'filename': path, 'raw': raw, 'filter_type': 'bilinear', 'wrap_mode': 'repeat'}

kraft_bsdf = {'type': 'bumpmap', 'arbitrary': {**tex(kraft_b, True), 'type': 'bitmap'},
              'scale': 1.0,
              'bsdf': {'type': 'diffuse', 'reflectance': tex(kraft_p)}}
hex_bsdf = {'type': 'bumpmap', 'arbitrary': tex(hex_b, True), 'scale': 14.0,
            'bsdf': {'type': 'diffuse', 'reflectance': tex(hex_p)}}

# kist
add('bodem', box_mesh('bodem', -IW/2-T, IW/2+T, 0, .5, -ID/2-T, ID/2+T, 9), kraft_bsdf)
add('w_voor', box_mesh('w_voor', -IW/2-T, IW/2+T, 0, WH, ID/2, ID/2+T, 9), kraft_bsdf)
add('w_achter', box_mesh('w_achter', -IW/2-T, IW/2+T, 0, WH, -ID/2-T, -ID/2, 9), kraft_bsdf)
add('w_l', box_mesh('w_l', -IW/2-T, -IW/2, 0, WH, -ID/2, ID/2, 9), kraft_bsdf)
add('w_r', box_mesh('w_r', IW/2, IW/2+T, 0, WH, -ID/2, ID/2, 9), kraft_bsdf)
# honingraat
add('plaat', box_mesh('plaat', -IW/2, IW/2, FL, top, -ID/2, ID/2, 10), hex_bsdf)
zf = zc[1] + R + .05; zb = zc[0] - R - .05
add('voor', box_mesh('voor', -IW/2, IW/2, top, top+bh, zf, ID/2, 10), hex_bsdf)
add('achter', box_mesh('achter', -IW/2, IW/2, top, top+bh, -ID/2, zb, 10), hex_bsdf)
add('midden', box_mesh('midden', -IW/2, IW/2, top, top+bh, zc[0]+R-.0, zc[1]-R+.0, 10), hex_bsdf)
add('einde_l', box_mesh('einde_l', -IW/2, -4.6, top, top+bh, -ID/2, ID/2, 10), hex_bsdf)
add('einde_r', box_mesh('einde_r', 4.6, IW/2, top, top+bh, -ID/2, ID/2, 10), hex_bsdf)

# pot
glass = {'type': 'thindielectric', 'int_ior': 1.5, 'ext_ior': 1.0}
honey_surf = {'type': 'roughplastic', 'diffuse_reflectance': {'type': 'rgb', 'value': [.86, .43, .035]}, 'alpha': .08, 'int_ior': 1.47, 'nonlinear': True}
honey_med = {'type': 'homogeneous', 'sigma_t': {'type': 'rgb', 'value': [0.03, 0.24, 1.0]}, 'albedo': {'type': 'rgb', 'value': [.35, .22, .08]}, 'scale': 0.55}
lid_bsdf = {'type': 'roughplastic', 'diffuse_reflectance': {'type': 'rgb', 'value': [.012, .012, .014]}, 'alpha': .12, 'int_ior': 1.5, 'nonlinear': True}
lid_cap = {'type': 'roughplastic', 'diffuse_reflectance': tex(f'{HERE}/deksel-rond.png'), 'alpha': .2, 'int_ior': 1.5, 'nonlinear': True}
label_bsdf = {'type': 'diffuse', 'reflectance': tex(f'{HERE}/etiket.png')}

def jar(k, z):
    x0 = -L/2
    outer = [(x0, 0.0), (x0, R-.4), (x0+.08, R-.2), (x0+.35, R-.02), (x0+.5, R), (L/2-.5, R), (L/2-.1, R-.25), (L/2+.35, R-.45), (L/2+.8, R-.45), (L/2+.8, 0.0)]
    outer = [(x, r) for x, r in outer]
    add(f'glas{k}', lathe(f'glas{k}', outer[1:-1], ox, axis, z), glass)
    add(f'glasA{k}', disk(f'glasA{k}', x0, R-.4, ox, axis, z, dirn=-1), glass)
    add(f'glasB{k}', disk(f'glasB{k}', L/2+.8, R-.45, ox, axis, z, dirn=1), glass)
    # honing als medium (null-grens)
    hr = R - .22
    honey = [(x0+.25, hr-.35), (x0+.5, hr), (L/2-.5, hr), (L/2-.1, hr-.25), (L/2+.35, hr-.45), (L/2+.7, hr-.45)]
    shapes[f'honing{k}'] = {'type': 'obj', 'filename': lathe(f'honing{k}', honey, ox, axis, z), 'bsdf': honey_surf}
    shapes[f'honingA{k}'] = {'type': 'obj', 'filename': disk(f'honingA{k}', x0+.25, hr-.35, ox, axis, z, dirn=-1), 'bsdf': honey_surf}
    shapes[f'honingB{k}'] = {'type': 'obj', 'filename': disk(f'honingB{k}', L/2+.7, hr-.45, ox, axis, z, dirn=1), 'bsdf': honey_surf}
    # etiket: boog van ~250 graden, voorzijde (richting +z/boven) gecentreerd; in u loopt het etiket rond
    lab = [(x0+.85, R+.012), (L/2-.65, R+.012)]
    arc = math.radians(250); mid = math.radians(45)   # midden naar camera (+y, +z)
    def uvf(u, v, x, r): return (u, 1 - v)
    add(f'etiket{k}', lathe(f'etiket{k}', lab, ox, axis, z, nseg=120, th0=mid-arc/2, th1=mid+arc/2, uvfun=uvf), label_bsdf, {'face_normals': False})
    # deksel
    xs = L/2 + .55; xe = L/2 + 2.2
    lid = [(xs, 0), (xs, R-.4), (xs+.08, R-.33), (xe-.08, R-.33), (xe, R-.4)]
    add(f'deksel{k}', lathe(f'deksel{k}', lid[1:], ox, axis, z), lid_bsdf)
    add(f'dekselA{k}', disk(f'dekselA{k}', xe, R-.4, ox, axis, z, dirn=1, rot=math.radians(35 + 90 * k)), lid_cap)

jar(0, zc[0]); jar(1, zc[1])

# ---------- scene ----------
D = 1.0
scene = {
    'type': 'scene',
    'integrator': {'type': 'volpath', 'max_depth': 28, 'rr_depth': 8},
    'sensor': {
        'type': 'perspective', 'fov': 12.0,
        'to_world': mi.ScalarTransform4f().look_at(origin=[-40, 92, 92], target=[0, 1.0, .6], up=[0, 1, 0]),
        'sampler': {'type': 'independent', 'sample_count': SPP},
        'film': {'type': 'hdrfilm', 'width': RES, 'height': RES, 'rfilter': {'type': 'gaussian'}, 'pixel_format': 'rgb'},
    },
    'floor': {'type': 'rectangle', 'to_world': mi.ScalarTransform4f().rotate([1, 0, 0], -90).scale(200),
              'bsdf': {'type': 'diffuse', 'reflectance': {'type': 'rgb', 'value': [.62, .60, .57]}}},
    'softbox': {'type': 'rectangle',
                'to_world': mi.ScalarTransform4f().look_at(origin=[-60, 55, 8], target=[0, 2, 0], up=[0, 1, 0]).scale([24, 22, 1]),
                'emitter': {'type': 'area', 'radiance': {'type': 'rgb', 'value': [13, 12.4, 11.2]}}},
    'fill': {'type': 'rectangle',
             'to_world': mi.ScalarTransform4f().look_at(origin=[50, 40, -20], target=[0, 2, 0], up=[0, 1, 0]).scale([16, 12, 1]),
             'emitter': {'type': 'area', 'radiance': {'type': 'rgb', 'value': [5, 5.3, 6]}}},
    'sky': {'type': 'constant', 'radiance': {'type': 'rgb', 'value': [.22, .23, .26]}},
}
scene.update(shapes)
INT = os.environ.get('INT')
if INT: scene['integrator'] = {'type': INT, 'max_depth': 28}
for k in os.environ.get('DROP','').split(','):
    scene.pop(k, None)
sc = mi.load_dict(scene)
img = mi.render(sc, spp=SPP)
print('mean', np.array(img).mean(), file=sys.stderr)
arr = np.array(img)
np.save(WORK + '/hdr.npy', arr)
# lege vloer met dezelfde belichting: de achtergrond wordt exact de crème van de site, schaduwen blijven
from PIL import ImageFilter as IF
empty = {k: v for k, v in scene.items() if k in ('type', 'integrator', 'sensor', 'floor', 'softbox', 'fill', 'sky')}
emp = np.array(mi.render(mi.load_dict(empty), spp=max(SPP, 96)))
np.save(WORK + '/emp.npy', emp)
bg = np.array([254, 249, 243]) / 255.
lin = lambda c: np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
corner = emp[RES-60:RES-20, 20:60].reshape(-1, 3).mean(0)
gain = lin(bg) / corner
ratio = arr / np.maximum(emp, 1e-4)
lum = lambda a: a @ np.array([.2126, .7152, .0722])
chroma = np.abs(arr / np.maximum(lum(arr)[..., None], 1e-4) - emp / np.maximum(lum(emp)[..., None], 1e-4)).max(axis=2)
mask = ((chroma > .06) | (lum(ratio) < .25)).astype('uint8') * 255
m = Image.fromarray(mask).filter(IF.MaxFilter(5)).filter(IF.GaussianBlur(1.6))
m = np.array(m).astype(float)[..., None] / 255
floor_part = np.minimum(ratio, 1.0) * lin(bg)
obj = np.minimum(arr * gain, 2.2)
x = m * obj + (1 - m) * floor_part
srgb = np.where(x <= .0031308, 12.92 * x, 1.055 * np.clip(x, 0, None) ** (1 / 2.4) - .055)
Image.fromarray((np.clip(srgb, 0, 1) * 255).astype('uint8')).save(OUT)
print('klaar', OUT)
