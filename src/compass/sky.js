// Twinkling star field behind the voyage. Purely decorative: the canvas is
// aria-hidden, it stops when the tab is hidden, and it holds still when the
// reader has asked for reduced motion.

export function startSky(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  let stars = [];
  let frame = null;

  const seed = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [...Array(Math.round((innerWidth * innerHeight) / 9000))].map(() => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: Math.random() * 1.3 + 0.3,
      phase: Math.random() * 6.28,
      // slow: a full breath takes several seconds, so the field
      // never competes with the words in front of it
      speed: Math.random() * 0.0035 + 0.0009,
    }));
  };

  const draw = (time) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = "#FFF4DE";
    for (const star of stars) {
      ctx.globalAlpha = calm.matches
        ? 0.35
        : 0.2 + 0.18 * Math.abs(Math.sin(star.phase + time * star.speed));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, 6.28);
      ctx.fill();
    }
    frame = calm.matches ? null : requestAnimationFrame(draw);
  };

  const stop = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };

  const run = () => {
    stop();
    frame = requestAnimationFrame(draw);
  };

  seed();
  run();

  addEventListener("resize", () => {
    seed();
    if (!document.hidden) run();
  });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));
  calm.addEventListener("change", run);
}
