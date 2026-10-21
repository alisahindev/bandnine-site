// bandnine.org. The dot mark (hero loop, and the closing section's nine gathered by the scroll), the
// test-flow story whose screen and timeline follow the scroll, the "which answer" marking demo, and the
// guides' contents list and reading progress. No libraries.
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v) => Math.min(1, Math.max(0, v));
// One rAF-throttled scroll and resize listener shared by everything that follows the scroll.
const onScroll = (() => {
  const fns = [];
  let queued = false;
  const run = () => { queued = false; fns.forEach((f) => f()); };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  return (f) => { fns.push(f); ask(); };
})();

// --- The mark. Shapes come from the app (site/assets/mark-shapes.js, generated from markDots.ts):
// ring, nine, bubble, mic, wave, arc, signal, pair, one, stop, each a tube of NU × NPHI dots. A morph
// moves dot (u, φ) of one shape to the same dot of the next, staggered from the top down both sides,
// easeInOutCubic over 0.8 s; the fly-in gathers the ring from a seeded cloud, easeOutQuart over 0.9 s.
// gather(name, g) is the same fly-in held at progress g (docs/design-system.md, pull to refresh).
function createMark(holder, { flyIn = true, turn = true } = {}) {
  const M = window.MARK;
  const canvas = holder.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const NU = M.NU, NPHI = M.NPHI, N = NU * NPHI, D = 230;
  const idx = (name) => Math.max(0, M.NAMES.indexOf(name));

  // Rest positions and normals per shape: [x, y, z, nx, ny, nz] × N.
  const shapes = M.NAMES.map((_, s) => {
    const a = new Float32Array(N * 6);
    for (let u = 0; u < NU; u++) {
      const o = (s * NU + u) * 5;
      const x = M.SPINES[o], y = M.SPINES[o + 1], nx = M.SPINES[o + 2], ny = M.SPINES[o + 3], r = M.SPINES[o + 4];
      for (let k = 0; k < NPHI; k++) {
        const p = (k / NPHI) * Math.PI * 2, c = Math.cos(p), sn = Math.sin(p), i = (u * NPHI + k) * 6;
        a[i] = x + nx * r * c; a[i + 1] = y + ny * r * c; a[i + 2] = r * sn;
        a[i + 3] = nx * c; a[i + 4] = ny * c; a[i + 5] = sn;
      }
    }
    return a;
  });
  let seed = 9;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const cloud = new Float32Array(N * 3), delay = new Float32Array(N);
  const ring = shapes[idx('ring')];
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2, d = 18 + Math.sqrt(rnd()) * 28;
    cloud[i * 3] = Math.cos(a) * d; cloud[i * 3 + 1] = Math.sin(a) * d; cloud[i * 3 + 2] = (rnd() - 0.5) * 60;
    delay[i] = ((ring[i * 6 + 1] + 45) / 90) * 0.25;
  }
  const L = [-0.5, -0.6, 0.62], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
  const quart = (t) => 1 - Math.pow(1 - t, 4);
  const cubicInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const cubicOut = (t) => 1 - Math.pow(1 - t, 3);

  // One wall clock for the timeline and the drawing, so a throttled frame rate never puts them out of step.
  const start = performance.now();
  const tick = () => (performance.now() - start) / 1000;
  const s = {
    from: ring, to: ring, morphAt: -1e9, flyAt: flyIn ? 0 : -1e9,
    gatherTo: null, g: 1, band: 0, bandAt: -1e9, clock: 0, clockAt: -1e9, level: 0,
    tx: 0, ty: 0, aimX: 0, aimY: 0,
  };
  const cur = new Float32Array(N * 6);
  const fade = new Float32Array(N).fill(1);
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = canvas.height = Math.round(holder.clientWidth * dpr);
  };
  resize();
  addEventListener('resize', () => { resize(); if (still) draw(0); });

  function settle(t) {
    const flying = t - s.flyAt < 1.3;
    for (let i = 0; i < N; i++) {
      const o = i * 6;
      if (s.gatherTo || flying) {
        const shape = s.gatherTo || ring;
        const e = s.gatherTo ? quart(clamp((s.g - delay[i]) / 0.75)) : still ? 1 : quart(clamp((t - s.flyAt - delay[i]) / 0.9));
        for (let j = 0; j < 3; j++) cur[o + j] = cloud[i * 3 + j] + (shape[o + j] - cloud[i * 3 + j]) * e;
        cur[o + 3] = shape[o + 3]; cur[o + 4] = shape[o + 4]; cur[o + 5] = shape[o + 5];
        fade[i] = 0.35 + 0.65 * e;
        continue;
      }
      fade[i] = 1;
      const e = cubicInOut(clamp((t - s.morphAt - delay[i]) / 0.8));
      for (let j = 0; j < 6; j++) cur[o + j] = s.from[o + j] + (s.to[o + j] - s.from[o + j]) * e;
    }
  }

  function draw(t) {
    const S = canvas.width, k = S / 124, c = S / 2;
    settle(t);
    // The pointer leans the mark towards it, eased so it never snaps (fine pointers only, see below).
    s.tx += (s.aimX - s.tx) * 0.06; s.ty += (s.aimY - s.ty) * 0.06;
    // The ring turns once in 40 s; a glyph (the closing nine) keeps upright and only sways.
    const spin = still || !turn ? 0 : (t / 40) * Math.PI * 2;
    const sway = still ? 0 : Math.min(1, t / 3);
    const ay = 0.34 * Math.sin(t * 0.17) * sway + s.tx, ax = 0.24 * Math.sin(t * 0.12 + 1) * sway + s.ty;
    const breath = still ? 1 : 1 + 0.02 * Math.sin(t * 1.05) + 0.06 * s.level;
    const cs = Math.cos(spin), ss = Math.sin(spin), cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    const rot = (x, y, z) => {
      const X = x * cs - y * ss, Y = x * ss + y * cs;
      const X2 = X * cy + z * sy, Z2 = -X * sy + z * cy;
      return [X2, Y * cx - Z2 * sx, Y * sx + Z2 * cx];
    };
    ctx.clearRect(0, 0, S, S);
    // Arcs around the mark: the coral clock while the candidate speaks, the amber band on the report.
    const R = 58 * k;
    if (s.clock > 0) {
      const f = still ? 1 : clamp((t - s.clockAt) / s.clock);
      ctx.lineWidth = 2.2 * k; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(240,119,91,.28)'; ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#F0775B'; ctx.beginPath(); ctx.arc(c, c, R, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
    }
    if (s.band > 0) {
      const f = (still ? 1 : cubicOut(clamp((t - s.bandAt) / 0.9))) * s.band;
      ctx.lineWidth = 3 * k; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(242,181,68,.22)'; ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#F2B544'; ctx.beginPath(); ctx.arc(c, c, R, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#F0775B';
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < N; i++) {
        const o = i * 6;
        const [nx, ny, nz] = rot(cur[o + 3], cur[o + 4], cur[o + 5]);
        if ((nz < 0) !== (pass === 0)) continue;
        const [x, y, z] = rot(cur[o], cur[o + 1], cur[o + 2]);
        const p = D / (D - z), light = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        ctx.globalAlpha = (pass === 0 ? 0.22 : 0.45 + 0.55 * light) * fade[i];
        ctx.beginPath();
        ctx.arc(c + x * p * k * breath, c + y * p * k * breath, M.DOT * (0.75 + 0.45 * light) * p * k, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  let raf = 0, visible = true;
  const loop = () => { draw(tick()); raf = visible ? requestAnimationFrame(loop) : 0; };
  if (still) draw(0);
  else {
    // Off screen the loop stops; a hidden tab stops it by itself (no animation frames there).
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    }).observe(holder);
    raf = requestAnimationFrame(loop);
  }

  return {
    tick,
    morph(name) { const t = tick(); settle(t); s.from = cur.slice(); s.to = shapes[idx(name)]; s.morphAt = t; },
    gather(name, g) {
      s.gatherTo = shapes[idx(name)]; s.g = g;
      if (still) draw(0);
    },
    clock(seconds) { s.clock = seconds; s.clockAt = tick(); },
    band(f) { s.band = f; s.bandAt = tick() + 0.5; },
    level(v) { s.level = v; },
    aim(x, y) { s.aimX = x; s.aimY = y; },
  };
}

// --- The hero: the mark performs one exam moment, and the headline rises with the fly-in.
(function () {
  const holder = document.querySelector('[data-demo]');
  if (!window.MARK || !holder) return;
  const h1 = document.querySelector('.hero h1');
  if (h1 && !still) {
    // Each word rises out of its own line box; the text itself is unchanged for readers and search.
    const words = h1.textContent.trim().split(/\s+/);
    h1.setAttribute('aria-label', h1.textContent.trim());
    const esc = (w) => w.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    h1.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');
    h1.classList.add('rise');
  }
  const mark = createMark(holder);
  const who = holder.querySelector('.who'), line = holder.querySelector('.line'), sub = holder.querySelector('.sub');
  const QUESTIONS = [
    'Do you prefer planning a trip carefully or making decisions as you go?',
    'What kind of music did you listen to when you were younger?',
    'Is there a skill you would like to learn in the next few years?',
  ];
  const caption = (w, voice, text, s) => {
    who.textContent = w; who.classList.toggle('voice', !!voice);
    line.classList.remove('band'); line.textContent = text; sub.textContent = s || '';
  };
  if (still) { caption('Alex, Part 1', true, QUESTIONS[0], ''); return; }

  if (matchMedia('(pointer: fine)').matches) {
    const hero = holder.closest('.hero');
    hero.addEventListener('pointermove', (e) => {
      const r = holder.getBoundingClientRect();
      mark.aim(clamp((e.clientX - r.left) / r.width) * 0.5 - 0.25, -(clamp((e.clientY - r.top) / r.height) * 0.36 - 0.18));
    });
    hero.addEventListener('pointerleave', () => mark.aim(0, 0));
  }

  const at = (ms, fn) => setTimeout(fn, ms);
  function ask(q) {
    mark.morph('bubble');
    caption('Alex, Part 1', true, '', '');
    const cursor = document.createElement('span'); cursor.className = 'cursor';
    line.textContent = ''; line.appendChild(cursor);
    const words = q.split(' ');
    let i = 0;
    const word = () => {
      if (i < words.length) {
        cursor.before(document.createTextNode((i ? ' ' : '') + words[i++]));
        at(130 + Math.random() * 90, word);
      } else {
        at(1400, answer);
      }
    };
    at(500, word);
  }
  function answer() {
    mark.morph('mic');
    caption('Your turn', true, 'Speak for as long as you can.', 'The clock keeps the exam’s timing.');
    const clockAt = mark.tick();
    mark.clock(3.4);
    const pulse = () => {
      const t = mark.tick();
      if (t - clockAt < 3.4) { mark.level(0.35 + 0.65 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.1))); at(60, pulse); } else mark.level(0);
    };
    pulse();
    at(3500, report);
  }
  function report() {
    mark.clock(0);
    mark.morph('ring');
    mark.band(6.5 / 9);
    caption('Your report', false, '', 'AI practice estimate. Not an official IELTS result.');
    line.classList.add('band'); line.innerHTML = 'Estimated band <b>6.5</b>';
    at(3200, nine);
  }
  let qi = 0;
  function nine() {
    mark.band(0);
    mark.morph('nine');
    caption('', false, '', '');
    at(1700, () => { mark.morph('ring'); at(900, () => ask(QUESTIONS[qi = (qi + 1) % QUESTIONS.length])); });
  }
  caption('', false, '', '');
  at(1500, () => ask(QUESTIONS[0]));
})();

// --- The closing section: the scroll gathers the dots into the nine, and scatters them again on the way back.
(function () {
  const holder = document.querySelector('[data-nine]');
  if (!window.MARK || !holder) return;
  const mark = createMark(holder, { flyIn: false, turn: false });
  if (still) { mark.gather('nine', 1); return; }
  onScroll(() => {
    const r = holder.getBoundingClientRect(), vh = innerHeight;
    // 0 when the mark's top enters the viewport, 1 once its centre reaches the middle of the screen.
    mark.gather('nine', clamp((vh - r.top) / (vh / 2 + r.height / 2)));
  });
})();

// --- The test flow: a sticky phone whose screen wipes to the step in view, and a timeline that fills with the scroll.
(function () {
  const story = document.querySelector('[data-story]');
  if (!story) return;
  const steps = [...story.querySelectorAll('.step[data-step]')];
  const shots = [...story.querySelectorAll('.screens img')];
  const marks = [...story.querySelectorAll('.rail li')];
  const stage = story.querySelector('.stage');
  const fill = story.querySelector('.rail .fill');
  let active = -1;
  onScroll(() => {
    if (getComputedStyle(stage).display === 'none') return;
    const mid = innerHeight / 2;
    let i = 0;
    steps.forEach((el, j) => { if (el.getBoundingClientRect().top < mid) i = j; });
    // Progress runs from the first step's top to the last step's centre crossing the middle of the screen.
    const a = steps[0].getBoundingClientRect(), b = steps[steps.length - 1].getBoundingClientRect();
    const p = clamp((mid - a.top) / (b.top + b.height / 2 - a.top));
    fill.style.transform = `scaleY(${p})`;
    story.style.setProperty('--p', p.toFixed(3));
    if (i === active) return;
    active = i;
    shots.forEach((s, j) => { s.classList.toggle('on', j === i); s.classList.toggle('past', j < i); });
    marks.forEach((m, j) => { m.classList.toggle('on', j === i); m.classList.toggle('done', j < i); });
    steps.forEach((el, j) => el.classList.toggle('on', j === i));
    story.dataset.tone = steps[i].dataset.tone || '';
  });
})();

// --- Which answer: tap one, read the marking. The pen strikes each error, then the better line writes in.
(function () {
  const quiz = document.querySelector('[data-quiz]');
  if (!quiz) return;
  const buttons = quiz.querySelectorAll('.answer');
  const verdict = quiz.querySelector('.verdict');
  const lead = verdict.querySelector('.lead');
  buttons.forEach((b) => b.addEventListener('click', () => {
    buttons.forEach((x) => { x.setAttribute('aria-pressed', String(x === b)); x.disabled = true; x.classList.toggle('right', x.dataset.answer === 'b'); });
    lead.textContent = b.dataset.answer === 'b'
      ? 'Yes. Both answers say the same things; the second says them with fewer errors and more flexible structures, which is what separates Band 6 from Band 7 in the descriptors.'
      : 'Not this one. The ideas are the same in both, but the second answer has fewer errors and more flexible structures, which is what separates Band 6 from Band 7 in the descriptors.';
    verdict.hidden = false;
    quiz.classList.add('marked');
    verdict.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' });
  }));
})();

// --- Guides: the contents list marks the section being read and fills with the reading progress.
(function () {
  const toc = document.querySelector('[data-toc]');
  const body = document.querySelector('[data-guide-body]');
  if (!toc || !body) return;
  const wide = matchMedia('(min-width: 1100px)');
  const sync = () => { toc.open = wide.matches; };
  sync();
  wide.addEventListener('change', sync);
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const heads = links.map((a) => document.getElementById(a.hash.slice(1)));
  const bar = document.querySelector('.readbar span');
  const fill = toc.querySelector('.fill');
  let active = -1;
  onScroll(() => {
    const r = body.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - innerHeight * 0.6));
    if (bar) bar.style.transform = `scaleX(${p})`;
    let i = -1;
    heads.forEach((h, j) => { if (h && h.getBoundingClientRect().top < innerHeight * 0.3) i = j; });
    if (fill) fill.style.transform = `scaleY(${i < 0 ? 0 : (i + 1) / heads.length})`;
    if (i === active) return;
    active = i;
    links.forEach((a, j) => { if (j === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  });
})();
