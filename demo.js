(() => {
  const hr = document.querySelector('hr');
  const art = document.querySelector('pre').firstChild;
  if (!hr || !art || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ART = art.nodeValue;
  const RAMP = ' `~:*iVO';
  const W = 320;

  // The score. Audio and visuals both read it, which is what keeps them in sync.
  const BPM = 140;
  const STEP = 60 / BPM / 4;
  const PARTS = [
    { name: 'intro', from: 0 }, { name: 'copper', from: 4 }, { name: 'glenz', from: 12 }, { name: 'tunnel', from: 20 },
    { name: 'kaos', from: 28 }, { name: 'dots', from: 36 }, { name: 'finale', from: 44 }, { name: 'end', from: 52 },
  ];
  const END_BAR = 55;
  const MAIN = [{ bass: 45, notes: [57, 60, 64] }, { bass: 41, notes: [53, 57, 60] }, { bass: 48, notes: [52, 55, 60] }, { bass: 43, notes: [55, 59, 62] }];
  const DARK = [{ bass: 38, notes: [50, 53, 57] }, { bass: 45, notes: [57, 60, 64] }, { bass: 40, notes: [52, 56, 59] }, { bass: 45, notes: [57, 60, 64] }];
  const SOFT = [{ bass: 41, notes: [53, 57, 60, 64] }, { bass: 40, notes: [52, 55, 59, 62] }, { bass: 38, notes: [50, 53, 57, 60] }, { bass: 45, notes: [57, 60, 64, 67] }];
  const MELODY_A = [
    [[0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 74, 2], [8, 76, 4], [12, 79, 2], [14, 76, 2]],
    [[0, 77, 4], [4, 76, 2], [6, 74, 2], [8, 72, 6], [14, 74, 2]],
    [[0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 67, 2], [8, 72, 4], [12, 74, 2], [14, 76, 2]],
    [[0, 74, 6], [6, 71, 2], [8, 74, 4], [12, 79, 4]],
  ];
  const MELODY_B = [
    [[0, 81, 2], [2, 79, 2], [4, 76, 2], [6, 79, 2], [8, 81, 3], [11, 84, 1], [12, 83, 2], [14, 81, 2]],
    [[0, 77, 2], [2, 81, 2], [4, 84, 4], [8, 81, 2], [10, 79, 2], [12, 77, 4]],
    [[0, 76, 2], [2, 79, 2], [4, 84, 4], [8, 83, 2], [10, 79, 2], [12, 76, 4]],
    [[0, 74, 2], [2, 79, 2], [4, 83, 4], [8, 86, 4], [12, 83, 2], [14, 79, 2]],
  ];
  const MELODY_SOFT = [
    [[0, 72, 8], [8, 69, 8]], [[0, 71, 8], [8, 67, 8]], [[0, 69, 6], [6, 65, 2], [8, 69, 8]], [[0, 72, 12], [12, 71, 4]],
  ];

  const partAt = bar => PARTS.reduce((found, part) => bar >= part.from ? part : found, PARTS[0]);
  const chordAt = bar => {
    const name = partAt(bar).name;
    return (name === 'tunnel' ? DARK : name === 'dots' ? SOFT : MAIN)[((bar % 4) + 4) % 4];
  };

  function drumsAt(step) {
    const bar = Math.floor(step / 16), s = step % 16, part = partAt(bar).name;
    const hit = { kick: 0, snare: 0, hat: 0, crash: 0 };
    if (s === 0 && bar > 0 && PARTS.some(candidate => candidate.from === bar)) hit.crash = 1;
    switch (part) {
      case 'intro':
        if (bar === 3 && s >= 8) hit.snare = 0.2 + (s - 8) * 0.1;
        break;
      case 'copper':
      case 'glenz':
        if (s === 0 || s === 8 || s === 10) hit.kick = 1;
        if (s === 4 || s === 12) hit.snare = 1;
        hit.hat = s % 4 === 2 ? 1 : s % 2 === 0 ? 0.5 : part === 'glenz' ? 0.25 : 0;
        break;
      case 'tunnel':
        if (s === 0 || s === 3 || s === 10) hit.kick = 1;
        if (s === 4 || s === 12) hit.snare = 1;
        if (s === 7 || s === 9) hit.snare = 0.35;
        hit.hat = s % 4 === 2 ? 0.9 : 0.35;
        break;
      case 'kaos':
      case 'finale':
        if (s % 4 === 0) hit.kick = 1;
        if (s === 4 || s === 12) hit.snare = 1;
        hit.hat = s % 4 === 2 ? 1 : 0.3;
        if (bar % 4 === 3 && s >= 12) hit.snare = 0.5 + (s - 12) * 0.15;
        break;
      case 'dots':
        if (s === 0 || s === 10) hit.kick = 0.8;
        if (s === 8) hit.snare = 0.8;
        if (s % 4 === 0) hit.hat = 0.3;
        if (bar === 43) hit.snare = 0.1 + s * 0.06;
        break;
      case 'end':
        if (bar === 52 && s === 0) hit.kick = 1;
        break;
    }
    if ((bar === 11 || bar === 19 || bar === 27) && s >= 12) hit.snare = 0.5 + (s - 12) * 0.15;
    return hit;
  }

  function bassAt(step) {
    const bar = Math.floor(step / 16), s = step % 16, part = partAt(bar).name, { bass } = chordAt(bar);
    switch (part) {
      case 'intro': return bar >= 2 && s === 0 ? { midi: bass, length: 15 } : null;
      case 'copper':
      case 'glenz': return s % 2 === 0 ? { midi: bass + (s % 4 === 2 ? 12 : 0), length: 1.8 } : null;
      case 'kaos':
      case 'finale': return { midi: bass + (s % 4 === 2 ? 12 : 0), length: 0.9 };
      case 'tunnel': return [0, 3, 6, 8, 11, 14].includes(s) ? { midi: bass + (s === 14 ? 12 : 0), length: s % 8 === 0 ? 2.5 : 1.5 } : null;
      case 'dots': return s % 8 === 0 ? { midi: bass, length: 7.5 } : null;
      case 'end': return bar === 52 && s === 0 ? { midi: 33, length: 32 } : null;
    }
    return null;
  }

  function leadAt(step) {
    const bar = Math.floor(step / 16), s = step % 16, part = partAt(bar).name;
    const melody = part === 'glenz' ? MELODY_A : part === 'kaos' ? MELODY_B : part === 'finale' ? (bar < 48 ? MELODY_A : MELODY_B) : part === 'dots' ? MELODY_SOFT : null;
    if (part === 'end') return bar === 52 && s === 0 ? { midi: 81, length: 32 } : null;
    if (!melody) return null;
    const note = melody[bar % 4].find(([at]) => at === s);
    return note ? { midi: note[1], length: note[2] } : null;
  }

  let active = false;

  addEventListener('click', event => {
    if (active) return;
    const range = document.createRange();
    range.selectNodeContents(art);
    const top = range.getBoundingClientRect().bottom;
    const sentence = hr.nextSibling;
    const firstLetter = sentence.nodeValue.search(/\S/);
    range.setStart(sentence, firstLetter);
    range.setEnd(sentence, firstLetter + 1);
    const bottom = range.getBoundingClientRect().top;
    const line = hr.getBoundingClientRect();
    if (event.clientY < top || event.clientY > bottom || event.clientX < line.left || event.clientX > line.right) return;
    active = true;
    start(event.clientY);
  });

  function start(originClientY) {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const songStart = audio.currentTime + 0.15;
    const synth = createSynth(audio, songStart);

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;z-index:9;margin:0;background:#000;image-rendering:pixelated;touch-action:none;cursor:none';
    document.body.append(canvas);
    const g = canvas.getContext('2d');
    const low = document.createElement('canvas');
    const lowContext = low.getContext('2d');
    let H, LW, LH, lowImage, lowPixels, fullImage, fullPixels, tunnel;

    function fit() {
      const view = window.visualViewport || { offsetLeft: 0, offsetTop: 0, width: innerWidth, height: innerHeight };
      Object.assign(canvas.style, { left: view.offsetLeft + 'px', top: view.offsetTop + 'px', width: view.width + 'px', height: view.height + 'px' });
      H = Math.max(200, Math.min(720, Math.round(W * view.height / view.width)));
      canvas.width = W;
      canvas.height = H;
      g.imageSmoothingEnabled = false;
      LW = W / 2;
      LH = Math.ceil(H / 2);
      low.width = LW;
      low.height = LH;
      lowImage = lowContext.createImageData(LW, LH);
      lowPixels = new Uint32Array(lowImage.data.buffer);
      fullImage = g.createImageData(W, H);
      fullPixels = new Uint32Array(fullImage.data.buffer);
      tunnel = null;
    }
    fit();
    const box = canvas.getBoundingClientRect();
    const originY = (originClientY - box.top) / box.height * H;

    const chrome = (c, w, h) => gradient(c, h, [[0, '#fff'], [0.3, '#9cf'], [0.49, '#126'], [0.51, '#fd8'], [0.75, '#c62'], [1, '#410']]);
    const fire = (c, w, h) => gradient(c, h, [[0, '#ffc'], [0.4, '#fd2'], [0.7, '#f70'], [1, '#c10']]);
    const ice = (c, w, h) => gradient(c, h, [[0, '#fff'], [0.5, '#8ef'], [1, '#26c']]);
    const black = () => '#000';
    const LOGO_FONT = fittedFont('HHRAVN', 38, 296, '"Arial Black", Impact, Arial, sans-serif');
    const logo = pixelText('HHRAVN', LOGO_FONT, 44, chrome);
    const logoShadow = pixelText('HHRAVN', LOGO_FONT, 44, black);
    const card = (text, size, paint) => pixelText(text, fittedFont(text, size, 300, '"Arial Black", Impact, Arial, sans-serif'), Math.round(size * 1.3), paint);
    const INTRO_CARDS = [null, card('HHRAVN.DK', 36, ice), card('PRESENTS', 30, ice), card('LAOS', 72, chrome)];
    const KAOS_CARDS = ['SKIBIDI!', 'HEJ MOR!', 'PIZZA?!', 'MERE OST!', 'KAOS!!', 'HEJ HEJ!'].map((text, i) => card(text, 44, i % 2 ? fire : chrome));
    const THE_END = card('THE END', 44, chrome);
    const SIGNATURE = card('HHRAVN.DK 2026', 14, ice);
    const SCROLL_FONT = 'bold 16px Verdana, Arial, sans-serif';
    const scrollerOne = pixelText('                          ...  '
      + 'TAP OR CLICK ANY TIME TO GET BACK TO THE PAGE  ...  ', SCROLL_FONT, 20, fire);
    const scrollerTwo = pixelText('                           ...  TAP TO GET BACK TO THE PAGE  ...          ', SCROLL_FONT, 20, ice);
    const pizza = pizzaSprite();
    const artTexture = buildArtTexture();
    const tunnelTextures = buildTunnelTextures();
    const shapes = buildShapes();
    const stars = Array.from({ length: 220 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() }));
    const pizzaState = { x: 40, y: 60, vx: 70, vy: 55 };

    const latency = audio.outputLatency || audio.baseLatency || 0;
    let songTime = -0.15, lastFrame = performance.now(), closingAt = 0;

    function close() {
      if (closingAt) return;
      closingAt = performance.now();
      synth.fadeOut();
    }
    const onKey = event => { if (event.key === 'Escape') close(); };
    const onVisibility = () => document.hidden ? audio.suspend() : audio.resume();
    canvas.addEventListener('click', close);
    addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    window.visualViewport?.addEventListener('resize', fit);
    addEventListener('resize', fit);

    function frame(now) {
      const previous = songTime;
      if (audio.state === 'running') songTime = Math.max(songTime, audio.currentTime - songStart - latency);
      else songTime += (now - lastFrame) / 1000;
      lastFrame = now;
      const dt = Math.min(0.1, Math.max(0, songTime - previous));

      const stepFloat = songTime / STEP;
      const step = Math.floor(stepFloat);
      const barFloat = stepFloat / 16;
      const bar = Math.floor(barFloat);
      const part = partAt(bar);
      const barsIn = barFloat - part.from;
      const barProgress = barFloat - bar;
      const kick = pulse(step, 'kick', 9);
      const snare = pulse(step, 'snare', 7);
      const t = songTime;

      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, H);

      switch (part.name) {
        case 'intro': {
          drawStars(dt, 0.12 + Math.max(0, barsIn) ** 2 * 0.28);
          const introCard = INTRO_CARDS[bar];
          if (introCard) drawCard(introCard, barProgress, bar === 3 ? 1 + snare * 0.08 : 1, bar === 3);
          break;
        }
        case 'copper': {
          drawStars(dt, 0.3 + kick * 0.6);
          drawCopperBars(t, H * 0.46, H * (0.18 + kick * 0.04), kick);
          const drop = barsIn < 1 ? (1 - bounce(barsIn)) * -H * 0.35 : 0;
          drawLogo(t, H * 0.06 + drop, 3 + kick * 5);
          drawScroller(scrollerOne, (t - PARTS[1].from * 16 * STEP) * 95, t, H * 0.78);
          break;
        }
        case 'glenz': {
          renderPlasma(t, kick, true);
          drawGlenz(t, W / 2, H * 0.47, Math.min(W, H) * 0.24 * (1 + kick * 0.15), snare);
          drawLogo(t, H * 0.06, 3 + kick * 5);
          drawScroller(scrollerOne, (t - PARTS[1].from * 16 * STEP) * 95, t, H * 0.78);
          break;
        }
        case 'tunnel': {
          renderTunnel(t, kick, snareTurns(step, part.from * 16) * 18 + snare * 6);
          drawRasterLines(t, 6, kick);
          drawRasterLines(t, H - 7, kick);
          break;
        }
        case 'kaos': {
          renderRoto(t, kick, snare);
          drawPizza(dt, kick);
          drawCard(KAOS_CARDS[bar - part.from], barProgress, 1 + kick * 0.15, false);
          glitch(kick);
          break;
        }
        case 'dots': {
          drawStars(dt, 0.08);
          drawCopperBars(t, H * 0.5, H * 0.3, kick * 0.3, 0.35);
          drawDots(t, barsIn, kick);
          break;
        }
        case 'finale': {
          renderPlasma(t, kick, true);
          drawCopperBars(t, H * 0.46, H * (0.2 + kick * 0.04), kick);
          drawGlenz(t, W / 2, H * 0.5, Math.min(W, H) * 0.17 * (1 + kick * 0.15), snare);
          drawLogo(t, H * 0.06, 3 + kick * 6);
          drawScroller(scrollerTwo, (t - part.from * 16 * STEP) * 105, t, H * 0.78);
          break;
        }
        case 'end': {
          drawStars(dt, 0.05);
          drawLogo(t, H / 2 - 82, 2);
          drawImageCentered(THE_END, W / 2, H / 2 + 6);
          drawImageCentered(SIGNATURE, W / 2, H / 2 + 46);
          const fade = Math.min(1, Math.max(0, (barsIn - 1.5) / 1.5));
          g.fillStyle = `rgba(0,0,0,${fade})`;
          g.fillRect(0, 0, W, H);
          break;
        }
      }

      const sincePart = (barFloat - part.from) * 16 * STEP;
      if (part.from > 0 && sincePart < 0.35) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = `rgba(255,255,255,${0.7 * (1 - sincePart / 0.35)})`;
        g.fillRect(0, 0, W, H);
      }
      const opened = (performance.now() - openedAt) / 1000;
      if (opened < 0.5) openMask(opened / 0.5);
      if (bar >= END_BAR) close();

      if (closingAt) {
        const q = (now - closingAt) / 1000 / 0.55;
        if (q >= 1) {
          canvas.remove();
          removeEventListener('keydown', onKey);
          document.removeEventListener('visibilitychange', onVisibility);
          window.visualViewport?.removeEventListener('resize', fit);
          removeEventListener('resize', fit);
          active = false;
          return;
        }
        closeMask(q);
      }
      requestAnimationFrame(frame);
    }
    const openedAt = performance.now();
    requestAnimationFrame(frame);

    function pulse(step, kind, decay) {
      for (let k = step; k >= 0 && k > step - 16; k--) {
        const strength = drumsAt(k)[kind];
        if (strength) return Math.exp(-(songTime - k * STEP) * decay) * Math.min(1, strength);
      }
      return 0;
    }

    function snareTurns(step, fromStep) {
      let count = 0;
      for (let k = fromStep; k <= step; k++) if (drumsAt(k).snare >= 1) count++;
      return count;
    }

    function blitLow() {
      lowContext.putImageData(lowImage, 0, 0);
      g.drawImage(low, 0, 0, LW, LH, 0, 0, W, LH * 2);
    }

    function drawStars(dt, speed) {
      const scale = Math.max(W, H) * 0.5;
      g.lineWidth = 1;
      for (const star of stars) {
        star.z -= dt * speed;
        if (star.z <= 0.02) {
          star.z += 1;
          star.x = Math.random() * 2 - 1;
          star.y = Math.random() * 2 - 1;
        }
        const x = W / 2 + star.x / star.z * scale, y = H / 2 + star.y / star.z * scale;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const brightness = Math.min(3, Math.floor((1 - star.z) * 4));
        const colour = ['#335', '#779', '#bbd', '#fff'][brightness];
        const trail = dt * speed * 3;
        if (trail > 0.01) {
          g.strokeStyle = colour;
          g.beginPath();
          g.moveTo(W / 2 + star.x / (star.z + trail) * scale, H / 2 + star.y / (star.z + trail) * scale);
          g.lineTo(x, y);
          g.stroke();
        }
        g.fillStyle = colour;
        g.fillRect(x, y, star.z < 0.3 ? 2 : 1, star.z < 0.3 ? 2 : 1);
      }
    }

    function drawCopperBars(t, centre, spread, kick, alpha = 1) {
      g.globalAlpha = alpha;
      const bars = Array.from({ length: 7 }, (_, i) => ({ phase: t * 1.7 + i * 0.42, hue: (i * 48 + t * 30) % 360 }))
        .sort((a, b) => Math.cos(a.phase) - Math.cos(b.phase));
      for (const bar of bars) {
        const y = Math.round(centre + Math.sin(bar.phase) * spread);
        for (let k = 0; k < 13; k++) {
          g.fillStyle = `hsl(${bar.hue},95%,${Math.min(95, 8 + (58 + kick * 25) * Math.sin(Math.PI * k / 12))}%)`;
          g.fillRect(0, y - 6 + k, W, 1);
        }
      }
      g.globalAlpha = 1;
    }

    function drawRasterLines(t, y, kick) {
      for (let x = 0; x < W; x += 4) {
        g.fillStyle = `hsl(${(t * 90 + x * 1.5) % 360},100%,${50 + kick * 30}%)`;
        g.fillRect(x, y, 4, 1);
      }
    }

    function drawLogo(t, y, wobble) {
      const x = Math.round((W - logo.width) / 2);
      y = Math.round(y);
      for (let row = 0; row < logo.height; row++) {
        const dx = Math.round(Math.sin(t * 3 + row * 0.22) * wobble);
        g.drawImage(logoShadow, 0, row, logo.width, 1, x + dx + 2, y + row + 2, logo.width, 1);
        g.drawImage(logo, 0, row, logo.width, 1, x + dx, y + row, logo.width, 1);
      }
      for (let px = 0; px < W; px += 4) {
        g.fillStyle = `hsl(${(t * 90 + px * 1.5) % 360},100%,55%)`;
        g.fillRect(px, y - 4, 4, 1);
        g.fillStyle = `hsl(${(t * 90 - px * 1.5 + 720) % 360},100%,55%)`;
        g.fillRect(px, y + logo.height + 4, 4, 1);
      }
    }

    function drawScroller(strip, offset, t, base) {
      base = Math.round(base);
      const water = base + 22;
      const sea = g.createLinearGradient(0, water, 0, H);
      sea.addColorStop(0, '#014');
      sea.addColorStop(1, '#000');
      g.fillStyle = sea;
      g.fillRect(0, water, W, H - water);

      const columns = [];
      for (let x = 0; x < W; x++) {
        const source = Math.floor((offset + x) % strip.width);
        const y = base - 10 + Math.round(Math.sin((x + t * 110) * 0.035) * 10);
        columns.push([source, y]);
        g.drawImage(strip, source, 0, 1, strip.height, x, y, 1, strip.height);
      }
      g.globalAlpha = 0.35;
      g.setTransform(1, 0, 0, -1, 0, water * 2);
      columns.forEach(([source, y], x) => {
        const ripple = Math.round(Math.sin(t * 5 + x * 0.1) * 1.5);
        g.drawImage(strip, source, 0, 1, strip.height, x + ripple, y, 1, strip.height);
      });
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
    }

    function drawGlenz(t, cx, cy, size, flash) {
      cy += Math.sin(t * 2.1) * H * 0.03;
      const ax = t * 0.9, ay = t * 1.3, az = t * 0.4;
      const rotate = ([x, y, z]) => {
        const y1 = y * Math.cos(ax) - z * Math.sin(ax);
        let z1 = y * Math.sin(ax) + z * Math.cos(ax);
        const x1 = x * Math.cos(ay) + z1 * Math.sin(ay);
        z1 = -x * Math.sin(ay) + z1 * Math.cos(ay);
        return [x1 * Math.cos(az) - y1 * Math.sin(az), x1 * Math.sin(az) + y1 * Math.cos(az), z1];
      };
      const corners = CUBE.map(rotate);
      const triangles = [];
      for (const face of FACES) {
        const quad = face.map(index => corners[index]);
        const tip = quad.reduce((sum, p) => sum.map((value, axis) => value + p[axis] * 0.35), [0, 0, 0]);
        for (let i = 0; i < 4; i++) {
          const points = [quad[i], quad[(i + 1) % 4], tip];
          const centroid = [0, 1, 2].map(axis => (points[0][axis] + points[1][axis] + points[2][axis]) / 3);
          const u = points[1].map((value, axis) => value - points[0][axis]);
          const v = points[2].map((value, axis) => value - points[0][axis]);
          let normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
          if (normal[0] * centroid[0] + normal[1] * centroid[1] + normal[2] * centroid[2] < 0) normal = normal.map(value => -value);
          const length = Math.hypot(...normal);
          const facing = normal[0] * centroid[0] + normal[1] * centroid[1] + normal[2] * (centroid[2] + DISTANCE);
          triangles.push({ points, depth: centroid[2], front: facing < 0, light: Math.min(1, Math.abs(normal[2] / length) + 0.25), checker: i % 2 });
        }
      }
      triangles.sort((a, b) => b.depth - a.depth);
      for (const triangle of triangles) {
        const light = Math.min(1, triangle.light + flash * 0.5);
        g.fillStyle = triangle.front
          ? (triangle.checker ? `rgba(${255 * light},${255 * light},${255 * light},0.55)` : `rgba(${60 * light},${210 * light},${255 * light},0.6)`)
          : (triangle.checker ? 'rgba(70,90,170,0.35)' : 'rgba(20,50,110,0.35)');
        g.beginPath();
        triangle.points.forEach(([x, y, z], index) => {
          const scale = size * DISTANCE / (z + DISTANCE);
          if (index) g.lineTo(cx + x * scale, cy + y * scale);
          else g.moveTo(cx + x * scale, cy + y * scale);
        });
        g.fill();
      }
    }

    function renderPlasma(t, kick, dim) {
      const palette = dim ? PLASMA_DIM : PLASMA;
      const a = t * 90, b = t * 70, c = t * 50, shift = t * 40 + kick * 50;
      const cx = LW / 2 + Math.sin(t * 0.8) * LW * 0.3, cy = LH / 2 + Math.cos(t * 0.6) * LH * 0.3;
      let i = 0;
      for (let y = 0; y < LH; y++) {
        const row = SIN[(y * 9 - b) & 1023];
        const dy = (y - cy) * (y - cy);
        for (let x = 0; x < LW; x++) {
          const dx = x - cx;
          const value = SIN[(x * 7 + a) & 1023] + row + SIN[((x + y) * 5 + c) & 1023] + SIN[(Math.sqrt(dx * dx + dy) * 12 - a * 2) & 1023];
          lowPixels[i++] = palette[(value * 40 + shift) & 255];
        }
      }
      blitLow();
    }

    function renderTunnel(t, kick, turn) {
      if (!tunnel) tunnel = buildTunnel(LW, LH);
      const sx = Math.round(LW / 2 + Math.sin(t * 0.9) * LW * 0.35), sy = Math.round(LH / 2 + Math.cos(t * 0.7) * LH * 0.35);
      const z = Math.round(t * 60 + kick * 10), spin = Math.round(t * 20 + turn);
      const { width, distance, angle, shade } = tunnel;
      let i = 0;
      for (let y = 0; y < LH; y++) {
        let j = (y + sy) * width + sx;
        for (let x = 0; x < LW; x++, j++) {
          lowPixels[i++] = tunnelTextures[shade[j]][((angle[j] + spin) & 127) * 128 + ((distance[j] + z) & 127)];
        }
      }
      blitLow();
    }

    function renderRoto(t, kick, snare) {
      const angle = Math.sin(t * 0.35) * 1.4 + t * 0.25 + snare * 0.1;
      const zoom = (1.8 + 1.2 * Math.sin(t * 0.45)) * (1 - kick * 0.12);
      const cos = Math.cos(angle) * zoom, sin = Math.sin(angle) * zoom;
      const u0 = 320 + Math.sin(t * 0.3) * 220, v0 = 128 + Math.cos(t * 0.4) * 90;
      const shake = Math.round(kick * 3);
      let i = 0;
      for (let y = 0; y < H; y++) {
        const dy = y - H / 2 + shake;
        let u = u0 - (W / 2) * cos - dy * sin, v = v0 - (W / 2) * sin + dy * cos;
        for (let x = 0; x < W; x++) {
          let ui = (u | 0) % ART_WIDTH;
          if (ui < 0) ui += ART_WIDTH;
          fullPixels[i++] = artTexture[((v | 0) & 255) * ART_WIDTH + ui];
          u += cos;
          v += sin;
        }
      }
      g.putImageData(fullImage, 0, 0);
    }

    function drawPizza(dt, kick) {
      const size = 39;
      pizzaState.x += pizzaState.vx * dt;
      pizzaState.y += pizzaState.vy * dt;
      if (pizzaState.x < 0 || pizzaState.x > W - size) pizzaState.vx *= -1;
      if (pizzaState.y < 0 || pizzaState.y > H - size) pizzaState.vy *= -1;
      pizzaState.x = Math.max(0, Math.min(W - size, pizzaState.x));
      pizzaState.y = Math.max(0, Math.min(H - size, pizzaState.y));
      const squash = kick * 6;
      g.drawImage(pizza, Math.round(pizzaState.x - squash / 2), Math.round(pizzaState.y + squash), size + squash, size - squash);
    }

    function drawCard(image, progress, scale, hold) {
      const pop = progress < 0.12 ? 1 + (1 - progress / 0.12) * 2 : 1;
      const fade = hold ? 1 : Math.max(0, Math.min(1, (0.95 - progress) / 0.25));
      if (fade <= 0) return;
      g.globalAlpha = fade;
      const w = image.width * scale * pop, h = image.height * scale * pop;
      g.drawImage(image, Math.round((W - w) / 2), Math.round((H - h) / 2), Math.round(w), Math.round(h));
      g.globalAlpha = 1;
    }

    function drawImageCentered(image, x, y) {
      g.drawImage(image, Math.round(x - image.width / 2), Math.round(y - image.height / 2));
    }

    function drawDots(t, barsIn, kick) {
      const segment = Math.floor(barsIn / 2);
      const morph = smoothstep(Math.min(1, (barsIn / 2 - segment) * 4));
      const target = shapes[segment % shapes.length];
      const source = segment === 0 ? null : shapes[(segment - 1) % shapes.length];
      const ax = t * 0.7, ay = t * 1.1;
      const scale = Math.min(W, H) * 0.34 * (1 + kick * 0.12);
      const projected = [];
      for (let i = 0; i < DOTS; i++) {
        const to = target[i];
        const [fx, fy, fz] = source ? source[i] : [0, 0, 0];
        const x = fx + (to[0] - fx) * morph, y = fy + (to[1] - fy) * morph, z = fz + (to[2] - fz) * morph;
        const y1 = y * Math.cos(ax) - z * Math.sin(ax), z1 = y * Math.sin(ax) + z * Math.cos(ax);
        const x2 = x * Math.cos(ay) + z1 * Math.sin(ay), z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
        const perspective = DISTANCE / (z2 + DISTANCE);
        projected.push([W / 2 + x2 * scale * perspective, H / 2 + y1 * scale * perspective, z2]);
      }
      projected.sort((a, b) => b[2] - a[2]);
      const hue = (segment * 70 + 180) % 360;
      for (const [x, y, z] of projected) {
        const near = (1 - z) / 2;
        g.fillStyle = `hsl(${hue},90%,${25 + near * 55 + kick * 15}%)`;
        const dot = near > 0.6 ? 3 : 2;
        g.fillRect(Math.round(x), Math.round(y), dot, dot);
      }
    }

    function glitch(amount) {
      if (amount < 0.35) return;
      for (let k = 0; k < 6; k++) {
        const y = Math.floor(Math.random() * H), h = 2 + Math.floor(Math.random() * 14);
        const dx = Math.round((Math.random() - 0.5) * 28 * amount);
        g.drawImage(canvas, 0, y, W, h, dx, y, W, h);
      }
    }

    function openMask(p) {
      const ease = 1 - (1 - p) ** 3;
      const top = originY * (1 - ease), bottom = Math.max(top + 2, originY + (H - originY) * ease);
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, top);
      g.fillRect(0, bottom, W, H - bottom);
      if (p < 0.25) {
        g.fillStyle = `rgba(255,255,255,${1 - p / 0.25})`;
        g.fillRect(0, top, W, bottom - top);
      }
    }

    function closeMask(q) {
      g.fillStyle = '#000';
      if (q < 0.6) {
        const half = Math.max(1, H / 2 * (1 - q / 0.6));
        g.fillRect(0, 0, W, H / 2 - half);
        g.fillRect(0, H / 2 + half, W, H / 2 - half);
        return;
      }
      const halfWidth = Math.max(1, W / 2 * (1 - (q - 0.6) / 0.4));
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff';
      g.fillRect(W / 2 - halfWidth, H / 2 - 1, halfWidth * 2, 2);
    }
  }

  const DISTANCE = 4.5;
  const CUBE = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  const FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]];
  const DOTS = 384;
  const ART_WIDTH = 640;
  const SIN = Float32Array.from({ length: 1024 }, (_, i) => Math.sin(i * Math.PI * 2 / 1024));
  const PLASMA = palette(i => [128 + 127 * Math.cos(2 * Math.PI * i / 256), 128 + 127 * Math.cos(2 * Math.PI * (i / 128 + 0.33)), 128 + 127 * Math.cos(2 * Math.PI * (i * 3 / 256 + 0.67))]);
  const PLASMA_DIM = palette(i => [0, 1, 2].map(channel => ((PLASMA[i] >> (channel * 8)) & 255) * 0.4));

  const smoothstep = x => x * x * (3 - 2 * x);
  function bounce(x) {
    if (x < 1 / 2.75) return 7.5625 * x * x;
    if (x < 2 / 2.75) return 7.5625 * (x -= 1.5 / 2.75) * x + 0.75;
    if (x < 2.5 / 2.75) return 7.5625 * (x -= 2.25 / 2.75) * x + 0.9375;
    return 7.5625 * (x -= 2.625 / 2.75) * x + 0.984375;
  }

  function palette(colour) {
    const result = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      const [r, g, b] = colour(i).map(value => Math.max(0, Math.min(255, Math.round(value))));
      result[i] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
    }
    return result;
  }

  function gradient(context, height, stops) {
    const result = context.createLinearGradient(0, 2, 0, height - 2);
    stops.forEach(([at, colour]) => result.addColorStop(at, colour));
    return result;
  }

  function fittedFont(text, size, maxWidth, family) {
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = `${size}px ${family}`;
    return `${Math.min(size, Math.floor(size * maxWidth / measure.measureText(text).width))}px ${family}`;
  }

  // Renders text as hard 1-bit pixels, then paints it with the given fill.
  function pixelText(text, font, height, fill) {
    const c = document.createElement('canvas');
    const context = c.getContext('2d');
    context.font = font;
    c.width = Math.ceil(context.measureText(text).width) + 4;
    c.height = height;
    context.font = font;
    context.textBaseline = 'middle';
    context.fillStyle = '#fff';
    context.fillText(text, 2, height / 2);
    const image = context.getImageData(0, 0, c.width, c.height);
    for (let i = 3; i < image.data.length; i += 4) image.data[i] = image.data[i] >= 110 ? 255 : 0;
    context.putImageData(image, 0, 0);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = fill(context, c.width, c.height);
    context.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function pizzaSprite() {
    const rows = [
      'CCCCCCCCCCCCC',
      'CCCCCCCCCCCCC',
      '.YYRRYYYYRYY.',
      '.YRRRYYYYYYY.',
      '..YRYYYRRYY..',
      '..YYYYYRRYY..',
      '...YYRYYYY...',
      '...YRRRYYY...',
      '....YRYYY....',
      '....YYYYY....',
      '.....YYY.....',
      '.....YYY.....',
      '......Y......',
    ];
    const colours = { C: '#c84', Y: '#fd4', R: '#c22' };
    const c = document.createElement('canvas');
    c.width = c.height = 13;
    const context = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((cell, x) => {
      if (!colours[cell]) return;
      context.fillStyle = colours[cell];
      context.fillRect(x, y, 1, 1);
    }));
    return c;
  }

  function buildArtTexture() {
    const c = document.createElement('canvas');
    c.width = ART_WIDTH;
    c.height = 256;
    const context = c.getContext('2d');
    const colours = ['#000', '#3a1c66', '#6b2a8c', '#aa2a78', '#e0503c', '#f8a030', '#ffe080', '#fff'];
    context.fillStyle = '#05061a';
    context.fillRect(0, 0, c.width, c.height);
    context.font = 'bold 9px monospace';
    context.textBaseline = 'top';
    ART.split('\n').slice(0, 32).forEach((line, y) => [...line.slice(0, 80)].forEach((character, x) => {
      const level = RAMP.indexOf(character);
      if (level <= 0) return;
      context.fillStyle = colours[level];
      context.globalAlpha = 0.45;
      context.fillRect(x * 8, y * 8, 8, 8);
      context.globalAlpha = 1;
      context.fillStyle = colours[Math.min(7, level + 1)];
      context.fillText(character, x * 8 + 1, y * 8);
    }));
    return new Uint32Array(context.getImageData(0, 0, c.width, c.height).data.buffer);
  }

  function buildTunnelTextures() {
    const base = new Uint32Array(128 * 128);
    for (let v = 0; v < 128; v++) {
      for (let u = 0; u < 128; u++) {
        base[v * 128 + u] = u % 32 < 2 || v % 32 < 2 ? 0xffffffff : PLASMA[((u ^ v) * 2) & 255];
      }
    }
    return Array.from({ length: 8 }, (_, level) => base.map(colour => {
      const factor = (level + 1) / 8;
      const r = (colour & 255) * factor, g = ((colour >> 8) & 255) * factor, b = ((colour >> 16) & 255) * factor;
      return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
    }));
  }

  function buildTunnel(width, height) {
    const tableWidth = width * 2, tableHeight = height * 2;
    const distance = new Uint8Array(tableWidth * tableHeight), angle = new Uint8Array(tableWidth * tableHeight), shade = new Uint8Array(tableWidth * tableHeight);
    const fade = Math.min(width, height) * 0.12;
    for (let y = 0, i = 0; y < tableHeight; y++) {
      for (let x = 0; x < tableWidth; x++, i++) {
        const dx = x - width, dy = y - height, r = Math.hypot(dx, dy) || 1;
        distance[i] = (2048 / r) & 127;
        angle[i] = (256 * (Math.atan2(dy, dx) / (2 * Math.PI) + 0.5)) & 127;
        shade[i] = Math.min(7, Math.floor(r / fade));
      }
    }
    return { width: tableWidth, distance, angle, shade };
  }

  function buildShapes() {
    const sphere = [], torus = [], cube = [], helix = [];
    for (let i = 0; i < DOTS; i++) {
      const y = 1 - 2 * (i + 0.5) / DOTS, r = Math.sqrt(1 - y * y), phi = i * 2.39996;
      sphere.push([Math.cos(phi) * r, y, Math.sin(phi) * r]);

      const a = (i % 24) / 24 * Math.PI * 2, b = Math.floor(i / 24) / 16 * Math.PI * 2;
      torus.push([(0.75 + 0.3 * Math.cos(b)) * Math.cos(a), 0.3 * Math.sin(b), (0.75 + 0.3 * Math.cos(b)) * Math.sin(a)]);

      const k = Math.floor(i / 6), p = ((k % 8) / 7 * 2 - 1) * 0.75, q = (Math.floor(k / 8) / 7 * 2 - 1) * 0.75, s = 0.75;
      cube.push([[s, p, q], [-s, p, q], [p, s, q], [p, -s, q], [p, q, s], [p, q, -s]][i % 6]);

      const strand = i % 2, step = Math.floor(i / 2), turn = step * 0.2 + strand * Math.PI;
      helix.push([Math.cos(turn) * 0.45, step / (DOTS / 2 - 1) * 2 - 1, Math.sin(turn) * 0.45]);
    }
    return [sphere, torus, cube, helix];
  }

  function createSynth(audio, songStart) {
    const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
    const compressor = audio.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 4;
    compressor.connect(audio.destination);
    const master = audio.createGain();
    master.gain.value = 0.55;
    master.connect(compressor);

    const echo = audio.createDelay();
    echo.delayTime.value = STEP * 3;
    const feedback = audio.createGain();
    feedback.gain.value = 0.35;
    const echoTone = audio.createBiquadFilter();
    echoTone.frequency.value = 2500;
    echo.connect(feedback).connect(echo);
    echo.connect(echoTone).connect(master);

    const arpFilter = audio.createBiquadFilter();
    arpFilter.Q.value = 6;
    arpFilter.frequency.setValueAtTime(250, songStart);
    arpFilter.frequency.exponentialRampToValueAtTime(7000, songStart + 4 * 16 * STEP);
    arpFilter.connect(master);

    const noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

    function envelope(time, duration, volume, attack = 0.004) {
      const gain = audio.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(duration, attack + 0.01));
      return gain;
    }

    function oscillator(type, midi, time, duration, volume, output, attack) {
      const node = audio.createOscillator();
      node.type = type;
      node.frequency.value = frequency(midi);
      node.connect(envelope(time, duration, volume, attack)).connect(output);
      node.start(time);
      node.stop(time + duration + 0.05);
      return node;
    }

    function noiseHit(time, duration, volume, type, cutoff) {
      const source = audio.createBufferSource();
      source.buffer = noise;
      const filter = audio.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = cutoff;
      source.connect(filter).connect(envelope(time, duration, volume)).connect(master);
      source.start(time, Math.random() * 0.5);
      source.stop(time + duration + 0.05);
    }

    function kick(time, volume) {
      const node = audio.createOscillator();
      node.frequency.setValueAtTime(160, time);
      node.frequency.exponentialRampToValueAtTime(42, time + 0.11);
      node.connect(envelope(time, 0.28, 0.9 * volume)).connect(master);
      node.start(time);
      node.stop(time + 0.32);
      noiseHit(time, 0.02, 0.2 * volume, 'highpass', 3000);
    }

    function snare(time, volume) {
      noiseHit(time, 0.18, 0.5 * volume, 'highpass', 1500);
      const body = audio.createOscillator();
      body.type = 'triangle';
      body.frequency.setValueAtTime(190, time);
      body.frequency.exponentialRampToValueAtTime(140, time + 0.08);
      body.connect(envelope(time, 0.09, 0.35 * volume)).connect(master);
      body.start(time);
      body.stop(time + 0.12);
    }

    function bass(time, midi, steps) {
      const filter = audio.createBiquadFilter();
      filter.frequency.value = 650;
      filter.Q.value = 4;
      filter.connect(master);
      oscillator('square', midi, time, steps * STEP, 0.22, filter);
      oscillator('sine', midi - 12, time, steps * STEP, 0.25, master);
    }

    function arp(time, notes, volume) {
      const node = oscillator('square', notes[0] + 12, time, STEP * 0.95, volume, arpFilter);
      for (let tick = 0; tick * 0.02 < STEP; tick++) node.frequency.setValueAtTime(frequency(notes[tick % notes.length] + 12), time + tick * 0.02);
    }

    function lead(time, midi, steps, type) {
      const duration = steps * STEP;
      const node = audio.createOscillator();
      node.type = type;
      node.frequency.value = frequency(midi);
      const vibrato = audio.createOscillator();
      vibrato.frequency.value = 5.5;
      const depth = audio.createGain();
      depth.gain.setValueAtTime(0, time);
      depth.gain.linearRampToValueAtTime(14, time + Math.min(0.3, duration));
      vibrato.connect(depth).connect(node.detune);
      const tone = audio.createBiquadFilter();
      tone.frequency.value = 3200;
      const shape = envelope(time, duration, type === 'triangle' ? 0.16 : 0.08, 0.01);
      node.connect(tone).connect(shape);
      shape.connect(master);
      shape.connect(echo);
      node.start(time);
      vibrato.start(time);
      node.stop(time + duration + 0.05);
      vibrato.stop(time + duration + 0.05);
    }

    function stab(time, notes) {
      const tone = audio.createBiquadFilter();
      tone.frequency.value = 1800;
      tone.connect(master);
      tone.connect(echo);
      for (const midi of notes) oscillator('sawtooth', midi, time, 0.18, 0.045, tone);
    }

    function pad(time, notes, steps, volume) {
      const tone = audio.createBiquadFilter();
      tone.frequency.value = 1400;
      tone.connect(master);
      tone.connect(echo);
      for (const midi of notes) {
        for (const detune of [-8, 8]) oscillator('sawtooth', midi, time, steps * STEP, volume, tone, 0.4).detune.value = detune;
      }
    }

    function siren(time, from, to, steps) {
      const node = oscillator('square', from, time, steps * STEP, 0.05, echo);
      node.frequency.exponentialRampToValueAtTime(frequency(to), time + steps * STEP);
    }

    function play(step, time) {
      const bar = Math.floor(step / 16), s = step % 16, part = partAt(bar).name, chord = chordAt(bar);
      const drums = drumsAt(step);
      if (drums.kick) kick(time, drums.kick);
      if (drums.snare) snare(time, drums.snare);
      if (drums.hat) noiseHit(time, 0.045, 0.14 * drums.hat, 'highpass', 8000);
      if (drums.crash) noiseHit(time, 1.4, 0.22, 'highpass', 5000);
      const bassNote = bassAt(step);
      if (bassNote) bass(time, bassNote.midi, bassNote.length);
      if (part !== 'dots' && part !== 'end') arp(time, chord.notes, part === 'intro' ? 0.14 : 0.05);
      const leadNote = leadAt(step);
      if (leadNote) lead(time, leadNote.midi, leadNote.length, part === 'dots' || part === 'end' ? 'triangle' : 'square');
      if (part === 'tunnel' && [0, 3, 6, 10, 12].includes(s)) stab(time, chord.notes.map(midi => midi + 12));
      if (part === 'dots' && s === 0) pad(time, chord.notes, 16, 0.03);
      if (part === 'end' && bar === 52 && s === 0) pad(time, [57, 60, 64, 69], 40, 0.07);
      if (part === 'kaos' && bar % 4 === 3 && s === 4) siren(time, 60, 96, 8);
    }

    let step = 0;
    let next = songStart;
    const lastStep = END_BAR * 16;
    const scheduler = setInterval(() => {
      while (step < lastStep && next < audio.currentTime + 0.2) {
        play(step++, next);
        next += STEP;
      }
    }, 25);

    return {
      fadeOut() {
        master.gain.setTargetAtTime(0, audio.currentTime, 0.12);
        setTimeout(() => {
          clearInterval(scheduler);
          audio.close();
        }, 700);
      },
    };
  }
})();
