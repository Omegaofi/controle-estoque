import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Mark} from '../components/Mark';
import {KineticText} from '../components/KineticText';
import {MARK_R} from './Scale';
import {color, ease, font, H, springs, W} from '../theme';
import {mix, ramp, springAt} from '../lib/motion';

const WORD = 'MERIDIAN';

/** 04 — The converged circle becomes the mark; the wordmark resolves from the centre outward. */
export const Resolve: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const meridian = springAt(f, fps, 8, {damping: 11, stiffness: 90, mass: 0.8});
  const equator = ramp(f, [12, 34]);
  const lift = springAt(f, fps, 16, springs.heavy);
  const markScale = mix(1, 0.78, lift);
  const markY = mix(0, -150, lift);
  const bloom = ramp(f, [10, 24]) * (1 - ramp(f, [24, 60], [0, 0.6], ease.soft));
  const push = ramp(f, [0, 72], [1, 1.035], ease.soft);
  const sweep = ramp(f, [44, 68], [130, -30], ease.inOut);

  return (
    <AbsoluteFill style={{transform: `scale(${push})`}}>
      {/* bloom behind the mark */}
      <div
        style={{
          position: 'absolute',
          left: W / 2 - 420,
          top: H / 2 + markY - 420,
          width: 840,
          height: 840,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(143,184,255,0.30), rgba(143,184,255,0.08) 50%, rgba(143,184,255,0))',
          opacity: bloom,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: W / 2 - (MARK_R + 20),
          top: H / 2 - (MARK_R + 20) + markY,
          transform: `scale(${markScale})`,
        }}
      >
        <Mark r={MARK_R} stroke={3} meridian={meridian} equator={equator} glow={0.6 + bloom} />
      </div>

      {/* wordmark */}
      <div style={{position: 'absolute', top: H / 2 + 36, width: '100%', display: 'flex', justifyContent: 'center'}}>
        <div style={{position: 'relative', display: 'flex', paddingLeft: '0.32em', fontFamily: font.display, fontWeight: 500, fontSize: 104}}>
          {WORD.split('').map((ch, i) => {
            const order = Math.abs(i - (WORD.length - 1) / 2);
            const d = 18 + order * 3.2;
            const p = springAt(f, fps, d, springs.word);
            const q = ramp(f, [d, d + 14]);
            const spread = (i - (WORD.length - 1) / 2) * (1 - p) * 34;
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  color: color.text,
                  marginRight: '0.32em',
                  opacity: q,
                  filter: q < 1 ? `blur(${(1 - q) * 12}px)` : undefined,
                  transform: `translate3d(${spread}px, ${(1 - p) * 40}px, 0)`,
                }}
              >
                {ch}
              </span>
            );
          })}
          {/* specular pass across the settled wordmark */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              paddingLeft: '0.32em',
              backgroundImage: `linear-gradient(100deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.95) 50%, rgba(143,184,255,0.6) 54%, rgba(255,255,255,0) 62%)`,
              backgroundSize: '250% 100%',
              backgroundPosition: `${sweep}% 0`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              opacity: ramp(f, [42, 46]) * (1 - ramp(f, [66, 70])),
            }}
          >
            {WORD.split('').map((ch, i) => (
              <span key={i} style={{marginRight: '0.32em'}}>
                {ch}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{position: 'absolute', top: H / 2 + 196, width: '100%', display: 'flex', justifyContent: 'center'}}>
        <KineticText
          lines={['Infrastructure for what comes next.']}
          size={30}
          weight={400}
          family={font.text}
          tracking={0}
          fill={color.dim}
          delay={36}
          stagger={2.5}
          tilt={0}
          align="center"
        />
      </div>
    </AbsoluteFill>
  );
};
