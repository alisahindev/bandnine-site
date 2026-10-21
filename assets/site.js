// bandnine.org. Three small things: the dot mark performing one exam moment in the hero, the sticky
// phone that follows the step in view, and the "which answer" marking demo. No libraries.

// --- The mark. Shapes come from the app (site/assets/mark-shapes.js, generated from markDots.ts):
// ring, nine, bubble, mic, wave, arc, signal, pair, one, stop, each a tube of NU × NPHI dots. A morph
// moves dot (u, φ) of one shape to the same dot of the next, staggered from the top down both sides,
// easeInOutCubic over 0.8 s; the fly-in gathers the ring from a seeded cloud, easeOutQuart over 0.9 s.
(function () {
  const M = window.MARK;
  const holder = document.querySelector('[data-demo]');
  if (!M || !holder) return;
  const canvas = holder.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const NU = M.NU, NPHI = M.NPHI, N = NU * NPHI, D = 230;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  const clamp = (v) => Math.min(1, Math.max(0, v));

  // State the timeline drives.
  let from = ring, to = ring, morphAt = -1e9, flyAt = 0;
  let band = 0, bandAt = -1e9, clock = 0, clockAt = -1e9, level = 0;
  const cur = new Float32Array(N * 6);
  let size = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    size = holder.clientWidth;
    canvas.width = canvas.height = Math.round(size * dpr);
  };
  resize();
  addEventListener('resize', () => { resize(); if (still) draw(0); });

  function settle(t) {
    const flying = t - flyAt < 1.3;
    for (let i = 0; i < N; i++) {
      const o = i * 6;
      if (flying) {
        const e = still ? 1 : quart(clamp((t - flyAt - delay[i]) / 0.9));
        cur[o] = cloud[i * 3] + (ring[o] - cloud[i * 3]) * e;
        cur[o + 1] = cloud[i * 3 + 1] + (ring[o + 1] - cloud[i * 3 + 1]) * e;
        cur[o + 2] = cloud[i * 3 + 2] + (ring[o + 2] - cloud[i * 3 + 2]) * e;
        cur[o + 3] = ring[o + 3]; cur[o + 4] = ring[o + 4]; cur[o + 5] = ring[o + 5];
        continue;
      }
      const e = cubicInOut(clamp((t - morphAt - delay[i]) / 0.8));
      for (let j = 0; j < 6; j++) cur[o + j] = from[o + j] + (to[o + j] - from[o + j]) * e;
    }
    return flying;
  }

  function draw(t) {
    const S = canvas.width, k = S / 124, c = S / 2;
    const flying = settle(t);
    const spin = still ? 0 : (t / 40) * Math.PI * 2;
    const sway = still ? 0 : Math.min(1, t / 3);
    const ay = 0.34 * Math.sin(t * 0.17) * sway, ax = 0.24 * Math.sin(t * 0.12 + 1) * sway;
    const breath = still ? 1 : 1 + 0.02 * Math.sin(t * 1.05) + 0.06 * level;
    const cs = Math.cos(spin), ss = Math.sin(spin), cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    const rot = (x, y, z) => {
      const X = x * cs - y * ss, Y = x * ss + y * cs;
      const X2 = X * cy + z * sy, Z2 = -X * sy + z * cy;
      return [X2, Y * cx - Z2 * sx, Y * sx + Z2 * cx];
    };
    ctx.clearRect(0, 0, S, S);
    // Arcs around the mark: the coral clock while the candidate speaks, the amber band on the report.
    const R = 58 * k;
    if (clock > 0) {
      const f = still ? 1 : clamp((t - clockAt) / clock);
      ctx.lineWidth = 2.2 * k; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(240,119,91,.28)'; ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#F0775B'; ctx.beginPath(); ctx.arc(c, c, R, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
    }
    if (band > 0) {
      const f = (still ? 1 : cubicOut(clamp((t - bandAt) / 0.9))) * band;
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
        const e = flying && !still ? quart(clamp((t - flyAt - delay[i]) / 0.9)) : 1;
        ctx.globalAlpha = (pass === 0 ? 0.22 : 0.45 + 0.55 * light) * (0.35 + 0.65 * e);
        ctx.beginPath();
        ctx.arc(c + x * p * k * breath, c + y * p * k * breath, M.DOT * (0.75 + 0.45 * light) * p * k, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // --- The caption under the mark and the timeline that drives both.
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
  if (still) {
    draw(0);
    caption('Alex, Part 1', true, QUESTIONS[0], '');
    return;
  }
  // One wall clock for the timeline and the drawing, so a throttled frame rate never puts them out of step.
  const start = performance.now();
  const tick = () => (performance.now() - start) / 1000;
  let now = 0, raf = 0, visible = true;
  const at = (ms, fn) => setTimeout(fn, ms);
  const morph = (name) => { now = tick(); settle(now); from = cur.slice(); to = shapes[idx(name)]; morphAt = now; };

  function ask(q) {
    morph('bubble');
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
    morph('mic');
    caption('Your turn', true, 'Speak for as long as you can.', 'The clock keeps the exam’s timing.');
    clock = 3.4; clockAt = tick();
    const pulse = () => { const t = tick(); if (clock > 0 && t - clockAt < clock) { level = 0.35 + 0.65 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.1)); at(60, pulse); } else { level = 0; } };
    pulse();
    at(3500, report);
  }
  function report() {
    clock = 0;
    morph('ring');
    band = 6.5 / 9; bandAt = tick() + 0.5;
    caption('Your report', false, '', 'AI practice estimate. Not an official IELTS result.');
    line.classList.add('band'); line.innerHTML = 'Estimated band <b>6.5</b>';
    at(3200, nine);
  }
  let qi = 0;
  function nine() {
    band = 0;
    morph('nine');
    caption('', false, '', '');
    at(1700, () => { morph('ring'); at(900, () => ask(QUESTIONS[qi = (qi + 1) % QUESTIONS.length])); });
  }

  const loop = () => {
    now = tick();
    draw(now);
    raf = visible ? requestAnimationFrame(loop) : 0;
  };
  // Off screen the loop stops; a hidden tab stops it by itself (no animation frames there).
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(loop);
  }).observe(holder);
  raf = requestAnimationFrame(loop);
  caption('', false, '', '');
  at(1500, () => ask(QUESTIONS[0]));
})();

// --- Sticky phone: the screen follows the step in view (desktop only; mobile stacks the screens).
(function () {
  const shots = document.querySelectorAll('.stage .phone');
  if (!shots.length) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const i = +e.target.dataset.step;
    shots.forEach((s, j) => s.classList.toggle('on', j === i));
  }), { rootMargin: '-45% 0px -45% 0px' });
  document.querySelectorAll('.step[data-step]').forEach((el) => io.observe(el));
})();

// --- Which answer: tap one, read the marking.
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
    verdict.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
})();
