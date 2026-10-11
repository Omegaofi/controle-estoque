import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {color, H, W} from '../theme';
import {keys} from '../lib/motion';

/** Global lighting: one key light that travels between scenes plus a cool fill from below. */
export const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const t = [0, 80, 120, 190, 220, 290, 320, 360];
  const kx = keys(f, t, [960, 960, 1300, 1260, 960, 960, 960, 960]);
  const ky = keys(f, t, [540, 540, 600, 600, 470, 480, 430, 430]);
  const kr = keys(f, t, [520, 760, 900, 900, 820, 820, 700, 760]);
  const ki = keys(f, [0, 10, 40, 90, 130, 300, 312, 360], [0, 0.55, 0.32, 0.3, 0.42, 0.36, 0.5, 0.34]);
  return (
    <AbsoluteFill style={{background: color.ink}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(${kr * 1.6}px ${kr}px at ${kx}px ${ky}px, rgba(70,104,180,${ki}) 0%, rgba(28,42,84,${ki * 0.55}) 38%, rgba(4,5,10,0) 72%)`,
        }}
      />
      <AbsoluteFill style={{background: `radial-gradient(1400px 420px at 50% 118%, rgba(60,80,140,0.20), rgba(4,5,10,0) 70%)`}} />
    </AbsoluteFill>
  );
};

/** Animated photographic grain; seed changes every frame. */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.09}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{opacity, mixBlendMode: 'screen', pointerEvents: 'none'}}>
      <svg width={W} height={H}>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(f / 2) % 97} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.9  0 0 0 0 1  0 0 0 1.6 -0.55" />
        </filter>
        <rect width={W} height={H} filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{strength?: number}> = ({strength = 0.72}) => (
  <AbsoluteFill
    style={{background: `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)`, pointerEvents: 'none'}}
  />
);

/** Dust motes scattered through depth; the camera's movement gives them parallax. */
export const Particles: React.FC<{count?: number; opacity?: number; seed?: string}> = ({count = 70, opacity = 1, seed = 'dust'}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{transformStyle: 'preserve-3d', opacity}}>
      {new Array(count).fill(0).map((_, i) => {
        const r = (k: string) => random(`${seed}-${i}-${k}`);
        const z = -1400 + r('z') * 1700;
        const x = (r('x') - 0.5) * 2600 + W / 2;
        const y = (r('y') - 0.5) * 1500 + H / 2 - f * (0.15 + r('v') * 0.35);
        const s = 1.4 + r('s') * 2.6;
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(f * (0.03 + r('t') * 0.05) + r('p') * 6));
        const near = z > 0;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: s,
              height: s,
              borderRadius: '50%',
              background: color.hot,
              opacity: (0.18 + r('o') * 0.5) * tw,
              transform: `translateZ(${z}px)`,
              filter: near ? 'blur(1.5px)' : undefined,
              boxShadow: `0 0 ${s * 3}px rgba(143,184,255,0.6)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** A receding floor grid that scrolls toward the camera. */
export const PerspectiveGrid: React.FC<{opacity: number; y?: number; speed?: number}> = ({opacity, y = 420, speed = 1.2}) => {
  const f = useCurrentFrame();
  const size = 4200;
  return (
    <div
      style={{
        position: 'absolute',
        left: W / 2 - size / 2,
        top: H / 2 - size / 2,
        width: size,
        height: size,
        opacity,
        transform: `translateY(${y}px) rotateX(82deg)`,
        backgroundImage: `linear-gradient(${color.hair} 1px, transparent 1px), linear-gradient(90deg, ${color.hair} 1px, transparent 1px)`,
        backgroundSize: '120px 120px',
        backgroundPosition: `0px ${f * speed}px`,
        WebkitMaskImage: 'radial-gradient(closest-side, black 0%, rgba(0,0,0,0.5) 35%, transparent 75%)',
        maskImage: 'radial-gradient(closest-side, black 0%, rgba(0,0,0,0.5) 35%, transparent 75%)',
      }}
    />
  );
};
