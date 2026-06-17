/* 無垠 WÚYÍN — immersive background scene (Three.js r128) */
(function () {
  "use strict";

  // ---- scroll reveal (independent of WebGL) ----
  var revealTargets = document.querySelectorAll(
    ".section-index, h2, .lead, .pillar, .work-card, .service, .contact-grid > div"
  );
  revealTargets.forEach(function (el) { el.classList.add("reveal"); });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("in"); });
  }

  // ---- WebGL scene ----
  var canvas = document.getElementById("bg-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (err) {
    canvas.style.display = "none";
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050507, 0.055);

  var camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 0.1, 100
  );
  camera.position.set(0, 0, 16);

  // ---- central morphing icosahedron (wireframe manifold) ----
  var geo = new THREE.IcosahedronGeometry(5.4, 4);
  var basePos = geo.attributes.position.array.slice(0);
  var baseDirs = [];
  for (var i = 0; i < basePos.length; i += 3) {
    var x = basePos[i], y = basePos[i + 1], z = basePos[i + 2];
    var len = Math.sqrt(x * x + y * y + z * z) || 1;
    baseDirs.push(x / len, y / len, z / len);
  }
  var wire = new THREE.WireframeGeometry(geo);
  var lineMat = new THREE.LineBasicMaterial({
    color: 0xbfeaff, transparent: true, opacity: 0.32
  });
  var lines = new THREE.LineSegments(wire, lineMat);
  scene.add(lines);

  var coreMat = new THREE.MeshBasicMaterial({
    color: 0x0a0c10, transparent: true, opacity: 0.45
  });
  var core = new THREE.Mesh(geo, coreMat);
  scene.add(core);

  // pseudo-noise displacement (no external noise lib)
  function displace(t) {
    var pos = geo.attributes.position.array;
    for (var k = 0; k < pos.length; k += 3) {
      var dx = baseDirs[k], dy = baseDirs[k + 1], dz = baseDirs[k + 2];
      var n =
        Math.sin(dx * 2.4 + t) * 0.5 +
        Math.cos(dy * 3.1 - t * 0.8) * 0.4 +
        Math.sin(dz * 2.7 + t * 1.3) * 0.35;
      var r = 5.4 + n * 0.75;
      pos[k] = dx * r; pos[k + 1] = dy * r; pos[k + 2] = dz * r;
    }
    geo.attributes.position.needsUpdate = true;
  }

  // ---- particle field ----
  var COUNT = window.innerWidth < 700 ? 900 : 1700;
  var pGeo = new THREE.BufferGeometry();
  var pArr = new Float32Array(COUNT * 3);
  for (var p = 0; p < COUNT; p++) {
    var radius = 9 + Math.random() * 22;
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);
    pArr[p * 3] = radius * Math.sin(phi) * Math.cos(theta);
    pArr[p * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
    pArr[p * 3 + 2] = radius * Math.cos(phi);
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pArr, 3));
  var pMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.045, transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  var points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  var accent = new THREE.PointLight(0x7fdfff, 1.2, 60);
  accent.position.set(8, 6, 12);
  scene.add(accent);
  scene.add(new THREE.AmbientLight(0x223044, 0.6));

  // ---- interaction state ----
  var targetX = 0, targetY = 0, curX = 0, curY = 0, scrollN = 0;

  window.addEventListener("pointermove", function (e) {
    targetX = (e.clientX / window.innerWidth - 0.5);
    targetY = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  function onScroll() {
    var max = document.body.scrollHeight - window.innerHeight;
    scrollN = max > 0 ? window.scrollY / max : 0;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  var clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();

    if (!reduced) displace(t * 0.45);

    curX += (targetX - curX) * 0.05;
    curY += (targetY - curY) * 0.05;

    lines.rotation.y = t * 0.06 + curX * 0.6;
    lines.rotation.x = curY * 0.4;
    core.rotation.copy(lines.rotation);
    points.rotation.y = t * 0.015;

    // scroll pushes camera deeper through the field
    camera.position.z = 16 - scrollN * 7;
    camera.position.y = scrollN * 2.2;
    camera.lookAt(0, 0, 0);

    accent.position.x = Math.sin(t * 0.4) * 10;
    accent.position.z = Math.cos(t * 0.4) * 10 + 4;

    renderer.render(scene, camera);
  }
  animate();
})();
