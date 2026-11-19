import { useEffect, useRef } from 'react';
import { createMelt } from '../gl/melt';

/** Decorative canvas: the event title and information remain real DOM content. */
export default function HeroEffect() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvas.current) return;
    return createMelt(canvas.current);
  }, []);

  return <canvas ref={canvas} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}
