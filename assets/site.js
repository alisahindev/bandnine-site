// Ring spine from src/components/markDots.ts (80 points: x, y, normal x, normal y, tube radius; ring 100 wide).
const RING = [-41.89,0,-1,0,5.53,-42.01,-3.26,-1,-0.08,6.94,-41.7,-6.51,-0.99,-0.15,8.78,-40.85,-9.66,-0.97,-0.23,10.1,-39.73,-12.73,-0.95,-0.31,10.49,-38.44,-15.73,-0.93,-0.38,10.05,-36.95,-18.64,-0.89,-0.45,8.84,-35.05,-21.29,-0.85,-0.52,7.14,-32.73,-23.59,-0.81,-0.58,5.66,-30.31,-25.78,-0.76,-0.65,5.07,-27.86,-27.94,-0.71,-0.71,5.71,-25.3,-29.97,-0.65,-0.76,7.55,-22.72,-31.97,-0.58,-0.82,9.52,-20.1,-33.92,-0.51,-0.86,10.55,-17.26,-35.54,-0.44,-0.9,10.6,-14.22,-36.7,-0.36,-0.93,9.75,-10.98,-37.08,-0.28,-0.96,8.13,-7.76,-36.6,-0.21,-0.98,6.08,-4.51,-36.29,-0.12,-0.99,4.73,-1.26,-36.59,-0.03,-1,4.71,1.85,-37.57,0.05,-1,6.08,4.83,-38.92,0.12,-0.99,8.36,7.95,-39.83,0.2,-0.98,10.71,11.18,-39.55,0.27,-0.96,12.31,14.07,-38.07,0.35,-0.94,12.7,16.29,-35.69,0.42,-0.91,11.67,17.95,-32.88,0.48,-0.88,9.66,19.91,-30.28,0.55,-0.84,7.36,22.76,-28.74,0.62,-0.78,5.79,25.99,-28.39,0.68,-0.74,6.37,29.23,-28.71,0.71,-0.7,8.38,32.2,-27.49,0.76,-0.65,9.68,34.13,-24.89,0.81,-0.59,10.16,34.95,-21.74,0.85,-0.53,10.18,35.1,-18.48,0.88,-0.47,9.96,35.2,-15.21,0.92,-0.4,9.52,35.95,-12.05,0.95,-0.32,9.24,37.56,-9.21,0.97,-0.24,9.24,39.28,-6.44,0.99,-0.16,8.94,40.68,-3.49,1,-0.09,8.4,41.37,-0.3,1,-0.01,7.82,41.07,2.94,1,0.07,7.13,39.93,5.99,0.99,0.15,6.35,38.65,9,0.97,0.23,6.27,37.77,12.14,0.95,0.31,7.41,36.99,15.31,0.92,0.38,8.97,35.96,18.41,0.89,0.46,9.87,34.67,21.41,0.85,0.53,9.9,33.18,24.32,0.81,0.59,9.07,31.3,26.98,0.76,0.65,7.59,28.86,29.15,0.7,0.71,6.17,26.2,31.05,0.64,0.76,5.64,23.54,32.94,0.58,0.81,6.4,20.81,34.73,0.51,0.86,8.06,17.92,36.26,0.44,0.9,9.58,14.95,37.62,0.37,0.93,10.26,11.9,38.77,0.29,0.96,10.08,8.76,39.67,0.22,0.98,9,5.53,40.14,0.14,0.99,7.25,2.27,40.15,0.06,1,5.57,-1,40.06,-0.02,1,4.79,-4.27,40.02,-0.11,0.99,5.11,-7.53,40.02,-0.19,0.98,6.44,-10.79,39.76,-0.26,0.97,8.24,-13.96,39,-0.34,0.94,9.67,-17.05,37.93,-0.41,0.91,10.31,-20.04,36.63,-0.48,0.88,10.07,-22.96,35.16,-0.55,0.84,8.91,-25.77,33.49,-0.61,0.79,7.09,-28.25,31.38,-0.67,0.74,5.62,-30.61,29.11,-0.72,0.69,5.26,-32.89,26.78,-0.78,0.63,6.15,-35.03,24.3,-0.82,0.57,7.86,-36.94,21.66,-0.86,0.51,9.38,-38.67,18.89,-0.9,0.44,10.1,-40.2,16,-0.93,0.37,9.96,-41.45,12.99,-0.95,0.3,9.02,-42.09,9.79,-0.97,0.23,7.51,-42.02,6.53,-0.99,0.15,5.96,-41.84,3.27,-1,0.08,5.16];

// The dot mark: the ring as a tube of coral dots (80 along × 14 around) that flies in from a
// scattered cloud, then turns once in 40 s with a slow sway. A still ring under Reduce Motion.
(function () {
  const holder = document.querySelector('[data-mark]');
  if (!holder) return;
  const NU = 80, NPHI = 14, DOT = 1.1, D = 230;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  holder.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let seed = 9;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const dots = [];
  for (let u = 0; u < NU; u++) {
    const [x, y, nx, ny, r] = RING.slice(u * 5, u * 5 + 5);
    for (let k = 0; k < NPHI; k++) {
      const p = (k / NPHI) * Math.PI * 2, c = Math.cos(p), s = Math.sin(p);
      const a = rnd() * Math.PI * 2, d = 18 + Math.sqrt(rnd()) * 28;
      dots.push({
        x: x + nx * r * c, y: y + ny * r * c, z: r * s, // rest position
        nx: nx * c, ny: ny * c, nz: s,                  // surface normal
        sx: Math.cos(a) * d, sy: Math.sin(a) * d, sz: (rnd() - 0.5) * 60, // scattered start
        delay: ((y + 45) / 90) * 0.25,
      });
    }
  }
  const L = [-0.5, -0.6, 0.62], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
  const quart = (t) => 1 - Math.pow(1 - t, 4);
  let size = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    size = holder.clientWidth;
    canvas.width = canvas.height = Math.round(size * dpr);
  };
  resize();
  addEventListener('resize', resize);

  function draw(t) {
    const k = (size * dpr) / 112, c = (size * dpr) / 2;
    const spin = still ? 0 : (t / 40) * Math.PI * 2;
    const sway = still ? 0 : Math.min(1, t / 3);
    const ay = 0.38 * Math.sin(t * 0.17) * sway, ax = 0.26 * Math.sin(t * 0.12 + 1) * sway;
    const breath = still ? 1 : 1 + 0.02 * Math.sin(t * 1.05);
    const cs = Math.cos(spin), ss = Math.sin(spin), cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    const rot = (x, y, z) => {
      let X = x * cs - y * ss, Y = x * ss + y * cs, Z = z;
      let X2 = X * cy + Z * sy, Z2 = -X * sy + Z * cy; // about y
      let Y2 = Y * cx - Z2 * sx, Z3 = Y * sx + Z2 * cx; // about x
      return [X2, Y2, Z3];
    };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#F0775B';
    for (let pass = 0; pass < 2; pass++) {
      for (const d of dots) {
        const e = still ? 1 : quart(Math.min(1, Math.max(0, (t - d.delay) / 0.9)));
        const [nx, ny, nz] = rot(d.nx, d.ny, d.nz);
        if ((nz < 0) !== (pass === 0)) continue;
        const [x, y, z] = rot(d.sx + (d.x - d.sx) * e, d.sy + (d.y - d.sy) * e, d.sz + (d.z - d.sz) * e);
        const p = D / (D - z), light = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        ctx.globalAlpha = (pass === 0 ? 0.22 : 0.45 + 0.55 * light) * (0.35 + 0.65 * e);
        ctx.beginPath();
        ctx.arc(c + x * p * k * breath, c + y * p * k * breath, DOT * (0.75 + 0.45 * light) * p * k, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  if (still) { draw(0); addEventListener('resize', () => draw(0)); return; }
  let start = null, raf = 0, visible = true, last = 0;
  const loop = (now) => {
    if (start === null) start = now;
    last = (now - start) / 1000;
    draw(last);
    raf = visible ? requestAnimationFrame(loop) : 0;
  };
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) { start = performance.now() - last * 1000; raf = requestAnimationFrame(loop); }
  }).observe(holder);
})();

// Reveal blocks as they enter, and swap the sticky phone's screen with the step in view.
(function () {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.rise').forEach((el) => io.observe(el));

  const shots = document.querySelectorAll('.stage .phone');
  if (!shots.length) return;
  const steps = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const i = +e.target.dataset.step;
    shots.forEach((s, j) => s.classList.toggle('on', j === i));
  }), { rootMargin: '-45% 0px -45% 0px' });
  document.querySelectorAll('.step[data-step]').forEach((el) => steps.observe(el));
})();
