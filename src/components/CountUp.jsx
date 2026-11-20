import { useEffect, useRef, useState } from 'react';

// Animated counter for stat cards: counts from 0 up to the value when the card
// comes into view. Keeps the original format: "1,148", "99.8%", "+12", "$4.2M".
// Values with no number in them (e.g. text) are shown as they are.
const NUM = /-?\d[\d,]*(\.\d+)?/;

function parse(value) {
  const str = String(value ?? '');
  const m = str.match(NUM);
  if (!m) return null;
  const raw = m[0];
  return {
    before: str.slice(0, m.index),
    after: str.slice(m.index + raw.length),
    target: parseFloat(raw.replace(/,/g, '')),
    decimals: m[1] ? m[1].length - 1 : 0,
    commas: raw.includes(','),
  };
}

function format(n, p) {
  const fixed = n.toFixed(p.decimals);
  if (!p.commas) return fixed;
  const [int, dec] = fixed.split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? '.' + dec : '');
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function CountUp({ value, duration = 1400 }) {
  const p = parse(value);
  const ref = useRef(null);
  const [shown, setShown] = useState(() => (p && !reduceMotion() ? 0 : null));

  useEffect(() => {
    if (!p || reduceMotion()) { setShown(null); return undefined; }
    let frame;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - k, 3); // ease-out
        setShown(p.target * eased);
        if (k < 1) frame = requestAnimationFrame(tick);
        else setShown(null);
      };
      frame = requestAnimationFrame(tick);
    };
    const el = ref.current;
    let io;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io.disconnect(); run(); }
      }, { threshold: 0.3 });
      io.observe(el);
    } else {
      run();
    }
    return () => { cancelAnimationFrame(frame); io?.disconnect(); };
    // restart only when the value itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  if (!p) return <>{value}</>;
  // <data> instead of <span>: the cards style every <span> inside them (labels),
  // so a span here would shrink the number
  return (
    <data ref={ref} className="countup" value={String(value)}>
      {shown === null ? value : p.before + format(shown, p) + p.after}
    </data>
  );
}
