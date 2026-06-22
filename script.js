// Vishwaguru — interaction layer
// Libraries (CDN, loaded via <script defer>): Three.js, Lenis
// (GSAP removed — reveals are lib-independent)
//
// Init order on boot:
//   1. Footer year
//   2. Hero headline word split
//   3. setupReveals — rAF+scroll+interval, hides only below-fold [data-reveal] elements
//   4. Particle field (canvas2d)
//   5. Three.js icosphere (hero) — with retry loop for CDN load
//   6. Cursor spotlight
//   7. Magnetic buttons + tilt cards
//   8. Engine carousel
//   9. Pill nav scroll-spy
//  10. Flowmap SVG
//  11. Core viz — Three.js 3D Fibonacci-sphere node-graph (with retry loop)
//  12. Smooth scroll via Lenis + keyboard routing
//  13. Contact form
//
// Everything motion-related respects prefers-reduced-motion.

(function () {
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isCoarsePointer = window.matchMedia('(hover: none)').matches;
  var CONTACT_EMAIL = 'abhishek.kanojia@vishwaguru.tech';

  function $all(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  // ============================================================
  // 1. Footer year
  // ============================================================
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // ============================================================
  // 2. Hero headline word split — walks childNodes so inline
  //    <span class="grad"> wrappers survive intact.
  // ============================================================
  $all('[data-split-words]').forEach(function (el) {
    el.setAttribute('aria-label', el.textContent.trim());
    var out = [];
    Array.prototype.forEach.call(el.childNodes, function (node) {
      if (node.nodeType === 3) {
        var parts = node.textContent.split(/(\s+)/);
        parts.forEach(function (p) {
          if (p === '') return;
          if (/^\s+$/.test(p)) {
            out.push(document.createTextNode(p));
          } else {
            var span = document.createElement('span');
            span.className = 'word';
            span.style.display = 'inline-block';
            span.textContent = p;
            out.push(span);
          }
        });
      } else if (node.nodeType === 1) {
        node.classList.add('word');
        node.style.display = 'inline-block';
        out.push(node);
      }
    });
    el.innerHTML = '';
    out.forEach(function (n) { el.appendChild(n); });
  });

  // ============================================================
  // 3. Reveals — lib-independent: only hides elements below the
  //    fold (top >= 90vh), uses rAF + scroll + interval + 5s safety net.
  //    Content already in view is never hidden — safe even if the
  //    page loads with a slow CDN or WebGL failure.
  // ============================================================
  function revealAll() {
    $all('[data-reveal]').forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    $all('[data-split-words] .word').forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  function setupReveals() {
    if (prefersReduced) return;
    var ease = 'cubic-bezier(.2,.7,.2,1)';
    var all = $all('[data-reveal]');
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      var vh = window.innerHeight || 800;
      var pending = [];
      all.forEach(function (el) {
        var r = el.getBoundingClientRect();
        el.style.transition = 'opacity .7s ' + ease + ', transform .7s ' + ease;
        if (r.top >= vh * 0.9) {
          // Below the fold — keep hidden, queue for scroll-in reveal.
          el.style.opacity = '0';
          el.style.transform = 'translate3d(0,24px,0)';
          pending.push(el);
        } else {
          // Above the fold — reveal immediately so hero content + sphere parent are visible on load.
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
      });
      function check() {
        var h = window.innerHeight || 800;
        for (var i = pending.length - 1; i >= 0; i--) {
          var el = pending[i], r = el.getBoundingClientRect();
          if (r.top < h * 0.88) {
            el.style.opacity = '1';
            el.style.transform = 'none';
            pending.splice(i, 1);
          }
        }
      }
      check();
      window.addEventListener('scroll', check, { passive: true });
      window.addEventListener('resize', check, { passive: true });
      var iv = setInterval(function () { check(); if (!pending.length) clearInterval(iv); }, 200);
      setTimeout(function () {
        pending.forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
        clearInterval(iv);
      }, 5000);
    }); });
  }

  // ============================================================
  // 4. Particle field
  // ============================================================
  function initParticles() {
    if (prefersReduced) return;
    var canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0;
    var COUNT = 70;
    var particles = [];

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    function rand(min, max) { return min + Math.random() * (max - min); }

    function seed() {
      particles = [];
      for (var i = 0; i < COUNT; i++) {
        var isAmber = Math.random() < 0.18;
        particles.push({
          x: rand(0, W),
          y: rand(0, H),
          r: rand(0.6, 1.8),
          vx: rand(-0.06, 0.06),
          vy: rand(-0.10, -0.02),
          a: rand(0.18, 0.55),
          color: isAmber ? '246, 201, 122' : '94, 234, 212',
        });
      }
    }

    resize();
    seed();
    window.addEventListener('resize', function () { resize(); seed(); }, { passive: true });

    var paused = false;
    document.addEventListener('visibilitychange', function () { paused = document.hidden; });

    function frame() {
      if (!paused) {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10) p.x = W + 10;
          if (p.x > W + 10) p.x = -10;
          if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + p.color + ',' + p.a + ')';
          ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ============================================================
  // 5. Three.js icosphere (hero) — retry loop waits for THREE
  // ============================================================
  function initSphere() {
    var canvas = document.getElementById('sphere-canvas');
    if (!canvas) return;
    if (typeof window.THREE === 'undefined') {
      initSphere._t = (initSphere._t || 0) + 1;
      if (initSphere._t < 40) setTimeout(initSphere, 100);
      return;
    }

    var THREE = window.THREE;
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 6;

    var group = new THREE.Group();
    scene.add(group);

    var geo1 = new THREE.IcosahedronGeometry(2.3, 3);
    var lines1 = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo1),
      new THREE.LineBasicMaterial({ color: 0x5EEAD4, transparent: true, opacity: 0.32 })
    );
    group.add(lines1);

    var geo2 = new THREE.IcosahedronGeometry(1.55, 2);
    var lines2 = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo2),
      new THREE.LineBasicMaterial({ color: 0xF6C97A, transparent: true, opacity: 0.18 })
    );
    group.add(lines2);

    var pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', geo1.attributes.position);
    group.add(new THREE.Points(pointGeo, new THREE.PointsMaterial({
      color: 0x5EEAD4,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    })));

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (w === 0 || h === 0) {
        // Layout not ready — retry until canvas has real dimensions.
        if ((resize._n = (resize._n || 0) + 1) < 30) setTimeout(resize, 100);
        return;
      }
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    var mx = 0, my = 0, tmx = 0, tmy = 0;
    if (!isCoarsePointer) {
      window.addEventListener('mousemove', function (e) {
        tmx = (e.clientX / window.innerWidth  - 0.5) * 0.6;
        tmy = (e.clientY / window.innerHeight - 0.5) * 0.6;
      }, { passive: true });
    }

    var paused = false;
    document.addEventListener('visibilitychange', function () { paused = document.hidden; });

    var t0 = performance.now();
    function animate() {
      if (!paused) {
        var t = (performance.now() - t0) / 1000;
        mx += (tmx - mx) * 0.04;
        my += (tmy - my) * 0.04;
        if (prefersReduced) {
          group.rotation.y = 0.6;
          group.rotation.x = 0.2;
        } else {
          group.rotation.y = t * 0.18 + mx * 0.6;
          group.rotation.x = Math.sin(t * 0.12) * 0.18 + my * 0.4;
          lines2.rotation.y = -t * 0.30;
          lines2.rotation.x =  t * 0.10;
        }
        renderer.render(scene, camera);
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  // ============================================================
  // 6. Cursor spotlight
  // ============================================================
  function initCursorLight() {
    if (prefersReduced || isCoarsePointer) return;
    var light = document.getElementById('cursor-light');
    if (!light) return;
    document.documentElement.classList.add('is-pointer');
    light.style.opacity = '1';

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var cx = tx, cy = ty;
    window.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
    }, { passive: true });
    (function tick() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      light.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(tick);
    })();
  }

  // ============================================================
  // 7. Magnetic buttons + tilt cards
  // ============================================================
  function initMagnetic() {
    if (prefersReduced || isCoarsePointer) return;
    $all('[data-magnetic]').forEach(function (el) {
      var strength = 0.22;
      var rect;
      el.addEventListener('mouseenter', function () { rect = el.getBoundingClientRect(); });
      el.addEventListener('mousemove', function (e) {
        if (!rect) rect = el.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top  - rect.height / 2;
        el.style.transform = 'translate3d(' + (x * strength) + 'px,' + (y * strength) + 'px,0)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; rect = null; });
    });
  }

  function initTilt() {
    if (prefersReduced || isCoarsePointer) return;
    $all('[data-tilt]').forEach(function (el) {
      var max = 6;
      var rect, rafId;
      var rx = 0, ry = 0, tx = 0, ty = 0;
      function update() {
        rx += (tx - rx) * 0.15;
        ry += (ty - ry) * 0.15;
        el.style.transform =
          'perspective(900px) rotateX(' + (-rx).toFixed(2) + 'deg)' +
          ' rotateY(' + ry.toFixed(2) + 'deg) translateZ(0)';
        if (Math.abs(rx - tx) > 0.05 || Math.abs(ry - ty) > 0.05) {
          rafId = requestAnimationFrame(update);
        } else {
          rafId = null;
        }
      }
      el.addEventListener('mouseenter', function () { rect = el.getBoundingClientRect(); });
      el.addEventListener('mousemove', function (e) {
        if (!rect) rect = el.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width  - 0.5;
        var y = (e.clientY - rect.top)  / rect.height - 0.5;
        ty = x * max;
        tx = y * max;
        if (!rafId) rafId = requestAnimationFrame(update);
      });
      el.addEventListener('mouseleave', function () {
        tx = 0; ty = 0;
        if (!rafId) rafId = requestAnimationFrame(update);
        rect = null;
      });
    });
  }

  // ============================================================
  // 8. Engine carousel
  // ============================================================
  function initCarousel() {
    var root = document.querySelector('[data-carousel]');
    if (!root) return;
    var track = root.querySelector('.carousel-track');
    var dotsHost = root.querySelector('.carousel-dots');
    var prevBtn = root.querySelector('[data-carousel-prev]');
    var nextBtn = root.querySelector('[data-carousel-next]');
    if (!track) return;
    var slides = Array.prototype.slice.call(track.children);
    if (slides.length === 0) return;

    function visibleCount() {
      if (window.innerWidth < 720) return 1;
      if (window.innerWidth < 1024) return 2;
      return 3;
    }
    function pages() {
      return Math.max(1, slides.length - visibleCount() + 1);
    }

    var current = 0;
    var autoTimer = null;

    function slideWidth() {
      return slides[0].getBoundingClientRect().width + 20;
    }
    function goTo(idx, smooth) {
      var max = pages() - 1;
      if (idx < 0) idx = max;
      if (idx > max) idx = 0;
      current = idx;
      track.scrollTo({ left: idx * slideWidth(), behavior: smooth === false ? 'auto' : 'smooth' });
      renderDots();
    }

    function renderDots() {
      if (!dotsHost) return;
      dotsHost.innerHTML = '';
      var n = pages();
      for (var i = 0; i < n; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        if (i === current) b.className = 'is-active';
        (function (idx) {
          b.addEventListener('click', function () { goTo(idx); restartAuto(); });
        })(i);
        dotsHost.appendChild(b);
      }
    }

    function syncFromScroll() {
      var w = slideWidth();
      if (w <= 0) return;
      var idx = Math.round(track.scrollLeft / w);
      if (idx !== current) {
        current = idx;
        renderDots();
      }
    }

    function startAuto() {
      if (prefersReduced) return;
      stopAuto();
      autoTimer = setInterval(function () { goTo(current + 1); }, 5000);
    }
    function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }
    function restartAuto() { stopAuto(); startAuto(); }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); restartAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); restartAuto(); });

    track.addEventListener('scroll', function () {
      if (track._scrollT) clearTimeout(track._scrollT);
      track._scrollT = setTimeout(syncFromScroll, 80);
    }, { passive: true });

    root.addEventListener('mouseenter', stopAuto);
    root.addEventListener('mouseleave', startAuto);

    window.addEventListener('resize', function () {
      renderDots();
      goTo(Math.min(current, pages() - 1), false);
    }, { passive: true });

    renderDots();
    startAuto();
  }

  // ============================================================
  // 9. Pill nav scroll-spy
  // ============================================================
  function initSpyNav() {
    var nav = document.querySelector('[data-spy-nav]');
    if (!nav) return;
    var links = $all('[data-spy]', nav);
    var idToLink = {};
    links.forEach(function (a) { idToLink[a.getAttribute('data-spy')] = a; });
    var sections = links
      .map(function (a) { return document.getElementById(a.getAttribute('data-spy')); })
      .filter(Boolean);
    if (sections.length === 0) return;

    function setActive(a) {
      links.forEach(function (x) {
        x.style.color = '';
        x.style.background = '';
        x.style.boxShadow = '';
        x.classList.remove('is-active');
      });
      if (a) {
        a.style.color = 'var(--teal)';
        a.style.background = 'rgba(94,234,212,.1)';
        a.style.boxShadow = '0 0 0 1px rgba(94,234,212,.22) inset';
        a.classList.add('is-active');
      }
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && idToLink[entry.target.id]) {
          setActive(idToLink[entry.target.id]);
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    sections.forEach(function (s) { io.observe(s); });
  }

  // ============================================================
  // 10. Flowmap — animated data flow diagram
  // ============================================================
  function initFlowmap() {
    var container = document.querySelector('.flowmap');
    if (!container) return;
    var svg = container.querySelector('.flowmap-svg');
    var core = container.querySelector('.flowmap-center');
    if (!svg || !core) return;

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var dots = [];

    function svgEl(tag, attrs) {
      var e = document.createElementNS(SVG_NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }

    function isDesktop() { return window.innerWidth >= 880; }

    function rebuild() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      dots = [];
      if (!isDesktop()) { svg.style.display = 'none'; return; }
      svg.style.display = '';

      var defs = svgEl('defs', {});
      [['teal', '#5EEAD4'], ['amber', '#F6C97A']].forEach(function (pair) {
        var f = svgEl('filter', {
          id: 'glow-' + pair[0], x: '-60%', y: '-60%', width: '220%', height: '220%',
        });
        f.innerHTML =
          '<feGaussianBlur stdDeviation="2.4" result="b"/>' +
          '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>';
        defs.appendChild(f);
      });
      svg.appendChild(defs);

      var cRect = container.getBoundingClientRect();
      var W = cRect.width, H = cRect.height;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);

      var coreRect = core.getBoundingClientRect();
      var coreCX = coreRect.left + coreRect.width  / 2 - cRect.left;
      var coreCY = coreRect.top  + coreRect.height / 2 - cRect.top;
      var coreLX = coreRect.left  - cRect.left + coreRect.width  * 0.18;
      var coreRX = coreRect.right - cRect.left - coreRect.width  * 0.18;
      var coreTY = coreRect.top   - cRect.top  + coreRect.height * 0.18;

      container.querySelectorAll('[data-flow-in]').forEach(function (node) {
        var r = node.getBoundingClientRect();
        addHorizPath(r.right - cRect.left, r.top + r.height / 2 - cRect.top, coreLX, coreCY, '#5EEAD4', 'teal');
      });
      container.querySelectorAll('[data-flow-top]').forEach(function (node) {
        var r = node.getBoundingClientRect();
        addVertPath(r.left + r.width / 2 - cRect.left, r.bottom - cRect.top, coreCX, coreTY, '#5EEAD4', 'teal');
      });
      container.querySelectorAll('[data-flow-out]').forEach(function (node) {
        var r = node.getBoundingClientRect();
        addHorizPath(coreRX, coreCY, r.left - cRect.left, r.top + r.height / 2 - cRect.top, '#F6C97A', 'amber');
      });
    }

    function addHorizPath(x1, y1, x2, y2, color, glowKey) {
      var midX = (x1 + x2) * 0.5;
      var d = 'M' + x1 + ',' + y1 + ' C' + midX + ',' + y1 + ' ' + midX + ',' + y2 + ' ' + x2 + ',' + y2;
      var path = svgEl('path', { d: d, fill: 'none', stroke: color, 'stroke-width': '1', 'stroke-opacity': '0.32' });
      svg.appendChild(path);
      spawnDots(path, color, glowKey);
    }
    function addVertPath(x1, y1, x2, y2, color, glowKey) {
      var midY = (y1 + y2) * 0.55;
      var d = 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + midY + ' ' + x2 + ',' + midY + ' ' + x2 + ',' + y2;
      var path = svgEl('path', { d: d, fill: 'none', stroke: color, 'stroke-width': '1', 'stroke-opacity': '0.32' });
      svg.appendChild(path);
      spawnDots(path, color, glowKey);
    }

    function spawnDots(path, color, glowKey) {
      var len = path.getTotalLength();
      [0, 0.5].forEach(function (off) {
        var dot = svgEl('circle', { r: '2.6', fill: color, filter: 'url(#glow-' + glowKey + ')' });
        svg.appendChild(dot);
        dots.push({
          path: path,
          length: len,
          dot: dot,
          speed: 0.00045 + Math.random() * 0.00025,
          offset: (off + Math.random() * 0.1) % 1,
        });
      });
    }

    function tick(now) {
      var dt = tick._last ? now - tick._last : 16;
      tick._last = now;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.offset = (d.offset + d.speed * dt) % 1;
        var pt = d.path.getPointAtLength(d.offset * d.length);
        d.dot.setAttribute('cx', pt.x);
        d.dot.setAttribute('cy', pt.y);
      }
      requestAnimationFrame(tick);
    }

    rebuild();
    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(rebuild, 150);
    }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
    setTimeout(rebuild, 250);
    setTimeout(rebuild, 700);

    if (!prefersReduced) requestAnimationFrame(tick);
  }

  // ============================================================
  // 11. Core viz — Three.js 3D Fibonacci-sphere node-graph
  //     Retry loop waits for THREE to load from CDN.
  // ============================================================
  function initCoreViz() {
    var canvas = document.getElementById('core-viz');
    if (!canvas) return;
    if (typeof window.THREE === 'undefined') {
      initCoreViz._t = (initCoreViz._t || 0) + 1;
      if (initCoreViz._t < 40) setTimeout(initCoreViz, 100);
      return;
    }
    var THREE = window.THREE;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5.4;
    var group = new THREE.Group(); scene.add(group);

    // Evenly distributed nodes via Fibonacci sphere
    var N = 22, R = 1.75, pts = [];
    var golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var yv = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(Math.max(0, 1 - yv * yv)), th = golden * i;
      pts.push(new THREE.Vector3(Math.cos(th) * rad * R, yv * R, Math.sin(th) * rad * R));
    }
    pts.forEach(function (p) {
      p.x += (Math.random() - 0.5) * 0.22;
      p.y += (Math.random() - 0.5) * 0.22;
      p.z += (Math.random() - 0.5) * 0.22;
    });

    // Edges: connect each node to 2 nearest neighbours (de-duplicated)
    var seen = {}, edgePos = [];
    for (var a = 0; a < N; a++) {
      var ds = [];
      for (var b = 0; b < N; b++) { if (a !== b) ds.push([b, pts[a].distanceTo(pts[b])]); }
      ds.sort(function (x, y) { return x[1] - y[1]; });
      for (var k = 0; k < 2; k++) {
        var nb = ds[k][0], key = Math.min(a, nb) + '-' + Math.max(a, nb);
        if (seen[key]) continue; seen[key] = 1;
        edgePos.push(pts[a].x, pts[a].y, pts[a].z, pts[nb].x, pts[nb].y, pts[nb].z);
      }
    }
    var lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
    group.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x5EEAD4, transparent: true, opacity: 0.26 })));

    // Round nodes — teal with a few amber accents
    var nodeGeo = new THREE.SphereGeometry(0.07, 14, 14);
    var tealMat = new THREE.MeshBasicMaterial({ color: 0x5EEAD4 });
    var amberMat = new THREE.MeshBasicMaterial({ color: 0xF6C97A });
    pts.forEach(function (p, idx) {
      var accent = (idx % 7 === 3);
      var m = new THREE.Mesh(nodeGeo, accent ? amberMat : tealMat);
      m.position.copy(p); m.scale.setScalar(accent ? 1.5 : 1);
      group.add(m);
    });

    function size() {
      var w = canvas.clientWidth || 176, h = canvas.clientHeight || 176;
      if (!w || !h) {
        if ((size._n = (size._n || 0) + 1) < 30) setTimeout(size, 100);
        return;
      }
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    size();
    window.addEventListener('resize', size, { passive: true });
    var paused = false;
    document.addEventListener('visibilitychange', function () { paused = document.hidden; });
    var t0 = performance.now();
    function frame() {
      if (!paused) {
        var t = (performance.now() - t0) / 1000;
        if (prefersReduced) {
          group.rotation.y = 0.5;
          group.rotation.x = 0.3;
        } else {
          group.rotation.y = t * 0.24;
          group.rotation.x = Math.sin(t * 0.2) * 0.18;
        }
        renderer.render(scene, camera);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ============================================================
  // 12. Smooth scroll + keyboard fix (Space/PageDown/PageUp/Arrows/Home/End)
  // ============================================================
  function initSmoothScroll() {
    if (prefersReduced || typeof window.Lenis === 'undefined') return;
    var lenis = new Lenis({
      duration: 1.05,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      smoothTouch: false,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    $all('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length > 1 && document.querySelector(id)) {
          e.preventDefault();
          lenis.scrollTo(id, { offset: -90, duration: 1.2 });
          history.replaceState(null, '', id);
        }
      });
    });

    // Route keyboard scroll keys through Lenis for smooth feel
    window.addEventListener('keydown', function (e) {
      var t = e.target || {}; var tag = t.tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable) return;
      var page = window.innerHeight * 0.85, stepN = 120;
      var cur = (typeof lenis.actualScroll === 'number') ? lenis.actualScroll : window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      function to(v, dur) { lenis.scrollTo(Math.max(0, Math.min(max, v)), { duration: dur || 0.8 }); }
      switch (e.code) {
        case 'Space':    e.preventDefault(); to(cur + (e.shiftKey ? -page : page)); break;
        case 'PageDown': e.preventDefault(); to(cur + page); break;
        case 'PageUp':   e.preventDefault(); to(cur - page); break;
        case 'ArrowDown': e.preventDefault(); to(cur + stepN, 0.5); break;
        case 'ArrowUp':   e.preventDefault(); to(cur - stepN, 0.5); break;
        case 'Home': e.preventDefault(); to(0, 1.2); break;
        case 'End':  e.preventDefault(); to(max, 1.2); break;
      }
    });
  }

  // ============================================================
  // Boot — reveals first (lib-independent), then each enhancement
  // guarded with safe() so one failure never blanks the page.
  // ============================================================
  function safe(fn) {
    try { fn(); } catch (err) {
      if (window.console) console.warn('vg init skipped:', err && err.message);
    }
  }

  // setupReveals runs unconditionally first; if reduced motion, show all
  setupReveals();
  if (prefersReduced) revealAll();

  safe(initParticles);
  safe(initSphere);
  safe(initCursorLight);
  safe(initMagnetic);
  safe(initTilt);
  safe(initCarousel);
  safe(initCoreViz);
  safe(initFlowmap);
  safe(initSpyNav);
  safe(initSmoothScroll);

  // ============================================================
  // 13. Contact form — POST to FormSubmit.co
  // ============================================================
  var form = document.getElementById('contact-form');
  if (form) {
    var ENDPOINT = 'https://formsubmit.co/ajax/' + CONTACT_EMAIL;
    var statusEl = document.getElementById('form-status');
    var submitBtn = form.querySelector('button[type="submit"]');

    function setStatus(kind, msg) {
      if (!statusEl) return;
      statusEl.className = 'form-status is-' + kind;
      statusEl.textContent = msg;
    }

    function setSubmitting(on) {
      if (!submitBtn) return;
      submitBtn.disabled = !!on;
      submitBtn.textContent = on ? 'Sending…' : 'Send message →';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Honeypot — silently drop bots
      var hp = form.querySelector('input[name="company_website"]');
      if (hp && hp.value.trim() !== '') {
        setStatus('success', 'Thanks — your message has been received.');
        form.reset();
        return;
      }

      var name    = form.name.value.trim();
      var email   = form.email.value.trim();
      var company = form.company.value.trim();
      var message = form.message.value.trim();

      if (!name || !email || !message) {
        setStatus('error', 'Please fill in name, email, and message.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setStatus('error', 'Please enter a valid email address.');
        return;
      }

      setStatus('loading', 'Sending your message…');
      setSubmitting(true);

      var payload = {
        Name:    name,
        Email:   email,
        Company: company || '—',
        Message: message,
        Source:  window.location.href,
        Submitted: new Date().toISOString(),
        _subject:  'Vishwaguru — Briefing request from ' + name + (company ? ' · ' + company : ''),
        _replyto:  email,
        _template: 'table',
        _captcha:  'false',
        _autoresponse:
          'Hi ' + name + ',\n\n' +
          'Thanks for reaching out about Vishwaguru — your briefing request has come through.\n\n' +
          'Abhishek personally reads every message and typically replies within two business days.\n\n' +
          '— Vishwaguru\nSystematic long-short equity research infrastructure\n',
      };

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          return r.json().then(function (data) { return { status: r.status, ok: r.ok, data: data }; });
        })
        .then(function (res) {
          if (window.console) console.log('[contact] FormSubmit response:', res);
          var data = res.data || {};
          var msg = (data.message || '').toString();
          var success = data.success === true || data.success === 'true';
          // FormSubmit's first-ever submission to a fresh address returns a
          // message instructing the inbox owner to confirm via a one-time link.
          var isActivation = /confirm|verify|activate/i.test(msg);

          if (success && !isActivation) {
            form.reset();
            setStatus('success', 'Sent. Abhishek will reply to ' + email + ' within two business days.');
          } else if (isActivation) {
            // The activation email is on the way to the inbox owner.
            setStatus('error',
              'Almost there — a one-time activation email has been sent to ' + CONTACT_EMAIL +
              '. Once activated, your message will be delivered. In the meantime, please email ' + CONTACT_EMAIL + ' directly.'
            );
          } else {
            throw new Error(msg || ('HTTP ' + res.status));
          }
        })
        .catch(function (err) {
          if (window.console) console.warn('[contact] error:', err);
          setStatus('error', 'Could not send right now. Please email ' + CONTACT_EMAIL + ' directly — sorry about this.');
        })
        .then(function () { setSubmitting(false); });
    });
  }
})();
