import React, { useEffect, useRef } from 'react';

export interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
}

export const CONFETTI_EVENT_NAME = 'ai4good:confetti';

/**
 * Imperative helper to trigger a confetti celebration from anywhere in the app.
 */
export function triggerConfetti(options?: ConfettiOptions): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(CONFETTI_EVENT_NAME, { detail: options || {} })
    );
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle';
}

const DEFAULT_COLORS = [
  '#10b981', // Emerald Neon
  '#06b6d4', // Cyber Cyan
  '#a855f7', // Aura Purple
  '#fbbf24', // Gold Flame
  '#ec4899', // Hot Pink
  '#3b82f6', // Electric Blue
];

export function CelebrationConfetti(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth || 1200;
      canvas.height = window.innerHeight || 800;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<ConfettiOptions>;
      const opts = customEvent.detail || {};
      const count = opts.particleCount ?? 80;
      const colors = opts.colors ?? DEFAULT_COLORS;
      const originX = opts.origin?.x ?? canvas.width / 2;
      const originY = opts.origin?.y ?? canvas.height / 2;

      const newParticles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
        const speed = Math.random() * 12 + 6;
        newParticles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 6 - 4, // Upward bias
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 12,
          opacity: 1,
          shape: Math.random() > 0.4 ? 'rect' : 'circle',
        });
      }

      particlesRef.current.push(...newParticles);

      if (!animFrameRef.current) {
        animate();
      }
    };

    const animate = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        particlesRef.current = [];
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const remaining: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // Gravity
        p.vx *= 0.98; // Air resistance
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.008; // Gentle fade

        if (p.opacity > 0 && p.y < canvas.height + 50) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);

          if (p.shape === 'rect') {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
          remaining.push(p);
        }
      }

      particlesRef.current = remaining;

      if (remaining.length > 0) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        animFrameRef.current = null;
      }
    };

    window.addEventListener(CONFETTI_EVENT_NAME, handleTrigger);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener(CONFETTI_EVENT_NAME, handleTrigger);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="celebration-confetti"
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden="true"
    />
  );
}
