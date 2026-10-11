import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {color, font, H, springs, W} from '../theme';
import {ramp, springAt} from '../lib/motion';

export const PANEL_W = 560;
export const PANEL_H = 360;

type Props = {
  gap: number[]; // z offset per layer (bottom → top)
  x: number;
  y: number;
  z: number;
  rx: number;
  rz: number;
  scale: number;
  detail: number; // 0..1 visibility of inner UI
  energy: number; // 0..1 core brightness (rises on collapse)
  opacity?: number;
  delay?: number;
};

const TAGS = ['L1 · Core', 'L2 · Mesh', 'L3 · Memory', 'L4 · Compute', 'L5 · Interface'];

const Tag: React.FC<{children: string}> = ({children}) => (
  <div style={{position: 'absolute', left: 26, top: 22, fontFamily: font.mono, fontSize: 12, letterSpacing: '0.24em', color: color.faint, textTransform: 'uppercase'}}>
    {children}
  </div>
);

const Content: React.FC<{i: number; delay: number}> = ({i, delay}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (i === 0) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(160px 110px at 50% 55%, rgba(228,238,255,0.55), rgba(143,184,255,0.22) 45%, rgba(143,184,255,0) 100%)`,
        }}
      />
    );
  }
  if (i === 1) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: '60px 30px 30px',
          backgroundImage: 'radial-gradient(circle, rgba(200,220,255,0.5) 1.2px, transparent 1.6px)',
          backgroundSize: '22px 22px',
          WebkitMaskImage: 'radial-gradient(closest-side, black, transparent)',
          maskImage: 'radial-gradient(closest-side, black, transparent)',
        }}
      />
    );
  }
  if (i === 2) {
    return (
      <div style={{position: 'absolute', left: 30, right: 30, top: 74, display: 'flex', flexDirection: 'column', gap: 17}}>
        {[0.82, 0.55, 0.94, 0.38, 0.7, 0.6, 0.86].map((w, k) => {
          const p = springAt(f, fps, delay + 6 + k * 2, springs.soft);
          return <div key={k} style={{height: 3, width: `${w * 100 * p}%`, background: k === 2 ? color.accent : 'rgba(200,220,255,0.28)', borderRadius: 2}} />;
        })}
      </div>
    );
  }
  if (i === 3) {
    return (
      <div style={{position: 'absolute', left: 30, right: 30, bottom: 30, height: 230, display: 'flex', alignItems: 'flex-end', gap: 10}}>
        {[0.35, 0.52, 0.44, 0.68, 0.6, 0.82, 0.74, 0.95, 0.88, 0.7, 0.92, 1].map((h, k) => {
          const p = springAt(f, fps, delay + 4 + k * 1.5, springs.snappy);
          return (
            <div
              key={k}
              style={{
                flex: 1,
                height: `${h * 100 * p}%`,
                borderRadius: 3,
                background: k === 11 ? `linear-gradient(${color.hot}, ${color.accent})` : 'linear-gradient(rgba(170,200,255,0.4), rgba(170,200,255,0.06))',
                boxShadow: k === 11 ? `0 0 18px ${color.accent}` : undefined,
              }}
            />
          );
        })}
      </div>
    );
  }
  // Top layer: interface — a live line drawing itself.
  const d = 'M 0 150 C 60 140, 90 96, 150 104 S 250 150, 300 92 S 400 40, 460 58 S 500 20, 500 20';
  const draw = ramp(f, [delay + 4, delay + 44]);
  return (
    <svg style={{position: 'absolute', left: 30, top: 90}} width={500} height={220} viewBox="0 0 500 220">
      <defs>
        <linearGradient id="lg" x1="0" x2="1">
          <stop offset="0" stopColor={color.accent} stopOpacity="0.1" />
          <stop offset="1" stopColor={color.hot} />
        </linearGradient>
      </defs>
      <line x1="0" x2="500" y1="190" y2="190" stroke="rgba(200,220,255,0.18)" />
      <path d={d} fill="none" stroke="url(#lg)" strokeWidth={2.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      <circle cx={500} cy={20} r={5 * draw} fill={color.hot} style={{filter: `drop-shadow(0 0 8px ${color.accent})`}} />
    </svg>
  );
};

/** Five floating glass layers in true 3D. */
export const GlassStack: React.FC<Props> = ({gap, x, y, z, rx, rz, scale, detail, energy, opacity = 1, delay = 0}) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        left: W / 2,
        top: H / 2,
        width: 0,
        height: 0,
        transformStyle: 'preserve-3d',
        transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${scale})`,
      }}
    >
      {gap.map((g, i) => {
        const top = i === gap.length - 1;
        const sweep = ((f * 1.6 + i * 40) % 260) - 80;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: -PANEL_W / 2,
              top: -PANEL_H / 2,
              width: PANEL_W,
              height: PANEL_H,
              borderRadius: 22,
              transform: `translateZ(${g}px)`,
              opacity,
              background: `linear-gradient(140deg, rgba(150,180,255,${0.13 + energy * 0.25}) 0%, rgba(120,150,230,${0.05 + energy * 0.2}) 55%, rgba(255,255,255,${0.02 + energy * 0.3}) 100%)`,
              border: `1px solid rgba(205,222,255,${0.2 + energy * 0.5})`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), 0 0 ${30 + energy * 80}px rgba(143,184,255,${0.08 + energy * 0.6})`,
              overflow: 'hidden',
            }}
          >
            <div style={{position: 'absolute', inset: 0, opacity: detail}}>
              <Tag>{TAGS[i]}</Tag>
              <Content i={i} delay={delay + i * 3} />
            </div>
            {/* specular sweep */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(115deg, rgba(255,255,255,0) ${sweep}%, rgba(255,255,255,${top ? 0.14 : 0.06}) ${sweep + 10}%, rgba(255,255,255,0) ${sweep + 22}%)`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
