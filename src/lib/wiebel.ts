// Handgetekende lijnen met opzet niet recht: kleine, vaste afwijkingen (seed), zodat elke
// tekening bij elke build hetzelfde blijft.
export type Punt = [number, number];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

// Zachte lijn door punten: kwadratische bochten via de middens.
function zacht(p: Punt[]): string {
  if (p.length < 3) return `M${f(p[0][0])} ${f(p[0][1])}L${f(p[p.length - 1][0])} ${f(p[p.length - 1][1])}`;
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i][0] + p[i + 1][0]) / 2;
    const my = (p[i][1] + p[i + 1][1]) / 2;
    d += `Q${f(p[i][0])} ${f(p[i][1])} ${f(mx)} ${f(my)}`;
  }
  const l = p[p.length - 1];
  d += `L${f(l[0])} ${f(l[1])}`;
  return d;
}

function segment(a: Punt, b: Punt, r: () => number, amp: number): Punt[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const n = Math.max(2, Math.ceil(len / 16));
  const nx = -dy / len;
  const ny = dx / len;
  const uit: Punt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const o = (r() - 0.5) * 2 * amp;
    uit.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
  }
  return uit;
}

export function lijn(a: Punt, b: Punt, seed: number, amp = 1.5): string {
  const r = rng(seed);
  return zacht(segment(a, b, r, amp));
}

// Reeks punten als open lijn; met `dicht` wordt hij bijna gesloten, met een klein overschot.
export function pad(punten: Punt[], seed: number, dicht = false, amp = 1.5): string {
  const r = rng(seed);
  const alle = dicht ? [...punten, punten[0], punten[1]] : punten;
  let uit: Punt[] = [];
  for (let i = 0; i < alle.length - 1; i++) {
    const s = segment(alle[i], alle[i + 1], r, amp);
    uit = uit.concat(i === 0 ? s : s.slice(1));
  }
  return zacht(uit);
}

export function cirkel(cx: number, cy: number, rad: number, seed: number, amp = 0.05): string {
  const r = rng(seed);
  const start = r() * Math.PI * 2;
  const n = 16;
  const punten: Punt[] = [];
  for (let i = 0; i <= n + 2; i++) {
    const hoek = start + (i / n) * Math.PI * 2;
    const straal = rad * (1 + (r() - 0.5) * 2 * amp) * (1 + 0.03 * Math.sin(hoek * 2 + seed));
    punten.push([cx + Math.cos(hoek) * straal, cy + Math.sin(hoek) * straal]);
  }
  return zacht(punten);
}
