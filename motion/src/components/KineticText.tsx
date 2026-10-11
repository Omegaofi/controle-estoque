import React from 'react';
import {useCurrentFrame, useVideoConfig, spring, type SpringConfig} from 'remotion';
import {color, ease, font, springs} from '../theme';
import {ramp} from '../lib/motion';

type Props = {
  lines: string[];
  size: number;
  delay?: number;
  stagger?: number;
  weight?: number;
  tracking?: number; // em
  lineHeight?: number;
  accent?: string[]; // words rendered with the specular accent fill
  exitAt?: number;
  exitStagger?: number;
  fill?: string;
  align?: 'left' | 'center' | 'right';
  family?: string;
  config?: Partial<SpringConfig>;
  rise?: number; // % of line height a word travels
  tilt?: number; // deg of entry rotation
};

/**
 * Words rise through individual masks on a spring. Blur, tracking and a slight
 * rotation resolve with them; the exit mirrors the entrance with expo-in.
 */
export const KineticText: React.FC<Props> = ({
  lines,
  size,
  delay = 0,
  stagger = 4,
  weight = 500,
  tracking = -0.045,
  lineHeight = 0.98,
  accent = [],
  exitAt,
  exitStagger = 2,
  fill = color.text,
  align = 'left',
  family = font.display,
  config = springs.word,
  rise = 112,
  tilt = 7,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let index = 0;

  return (
    <div style={{fontFamily: family, fontSize: size, fontWeight: weight, lineHeight, textAlign: align, color: fill}}>
      {lines.map((line, li) => (
        <div key={li} style={{whiteSpace: 'nowrap'}}>
          {line.split(' ').map((word, wi, arr) => {
            const i = index++;
            const start = delay + i * stagger;
            const p = spring({frame: frame - start, fps, config});
            const q = ramp(frame, [start, start + 16]);
            const e = exitAt === undefined ? 0 : ramp(frame, [exitAt + i * exitStagger, exitAt + i * exitStagger + 16], [0, 1], ease.in);
            const y = (1 - p) * rise - e * rise;
            const blur = (1 - q) * 10 + e * 8;
            const isAccent = accent.includes(word);
            const sweep = ramp(frame, [start + 6, start + 46], [120, -20], ease.soft);
            return (
              <span
                key={wi}
                style={{
                  display: 'inline-block',
                  overflow: 'hidden',
                  verticalAlign: 'top',
                  padding: '0.02em 0.06em 0.26em',
                  margin: `-0.02em ${wi === arr.length - 1 ? -0.06 : 0.17}em -0.26em -0.06em`,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    transform: `translate3d(0, ${y}%, 0) rotate(${(1 - p) * tilt}deg)`,
                    transformOrigin: '0% 100%',
                    filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
                    opacity: q * (1 - e),
                    letterSpacing: `${tracking + (1 - p) * 0.06}em`,
                    ...(isAccent
                      ? {
                          backgroundImage: `linear-gradient(100deg, ${color.text} 0%, ${color.text} 35%, ${color.hot} 45%, ${color.accent} 52%, ${color.text} 64%, ${color.text} 100%)`,
                          backgroundSize: '260% 100%',
                          backgroundPosition: `${sweep}% 0`,
                          WebkitBackgroundClip: 'text',
                          backgroundClip: 'text',
                          color: 'transparent',
                        }
                      : {}),
                  }}
                >
                  {word}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Small uppercase mono label with a clip-wipe and a leading tick. */
export const Label: React.FC<{text: string; delay?: number; exitAt?: number; color?: string; size?: number}> = ({
  text,
  delay = 0,
  exitAt,
  color: c = color.dim,
  size = 15,
}) => {
  const frame = useCurrentFrame();
  const wipe = ramp(frame, [delay, delay + 22]);
  const tick = ramp(frame, [delay - 4, delay + 14]);
  const out = exitAt === undefined ? 0 : ramp(frame, [exitAt, exitAt + 14], [0, 1], ease.in);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 18, opacity: 1 - out, fontFamily: font.mono, fontSize: size, letterSpacing: '0.28em', color: c, textTransform: 'uppercase'}}>
      <div style={{width: 36 * tick * (1 - out), height: 1, background: color.accent, boxShadow: `0 0 8px ${color.accent}`}} />
      <div style={{clipPath: `inset(0 ${(1 - wipe) * 100 + out * 0}% 0 0)`, transform: `translateX(${-out * 12}px)`}}>{text}</div>
    </div>
  );
};
