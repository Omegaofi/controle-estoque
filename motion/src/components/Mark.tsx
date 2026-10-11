import React from 'react';
import {color} from '../theme';

type Props = {
  r: number;
  stroke: number;
  meridian: number; // 0..1 ellipse opening
  equator: number; // 0..1 line draw (from centre out)
  glow: number;
};

/** The Meridian mark: a globe reduced to a circle, one meridian and the equator line of light. */
export const Mark: React.FC<Props> = ({r, stroke, meridian, equator, glow}) => {
  const s = r * 2 + 40;
  const c = s / 2;
  const half = (r + 2) * equator;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id="eq" gradientUnits="userSpaceOnUse" x1={c - r * 1.9} x2={c + r * 1.9} y1={c} y2={c}>
          <stop offset="0" stopColor={color.accent} stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" />
          <stop offset="1" stopColor={color.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx={c} cy={c} r={r} fill="none" stroke={color.hot} strokeWidth={stroke} />
      <ellipse cx={c} cy={c} rx={Math.max(0.01, r * 0.42 * meridian)} ry={r} fill="none" stroke={color.hot} strokeOpacity={0.85} strokeWidth={stroke} />
      <line
        x1={c - half * 1.9}
        x2={c + half * 1.9}
        y1={c}
        y2={c}
        stroke="url(#eq)"
        strokeWidth={stroke * 1.1}
        style={{filter: `drop-shadow(0 0 ${6 * glow}px ${color.accent}) drop-shadow(0 0 ${18 * glow}px ${color.accent})`}}
      />
    </svg>
  );
};
