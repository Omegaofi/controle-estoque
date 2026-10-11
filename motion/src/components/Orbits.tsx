import React from 'react';
import {useCurrentFrame} from 'remotion';
import {color, H, W} from '../theme';

export type Ring = {r: number; rx: number; ry: number; spin: number; draw: number; speed: number; nodes: number[]};

type Props = {rings: Ring[]; detail: number; stroke: number; strokeOpacity: number; cy?: number};

/** Tilted orbital rings in 3D with travelling comets and billboarded nodes. */
export const Orbits: React.FC<Props> = ({rings, detail, stroke, strokeOpacity, cy = 0}) => {
  const f = useCurrentFrame();
  return (
    <>
      {rings.map((ring, i) => {
        const {r, rx, ry, spin, draw, speed, nodes} = ring;
        const pad = 24;
        const size = r * 2 + pad * 2;
        const circ = 2 * Math.PI * r;
        const comet = circ * 0.16;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: W / 2 - size / 2,
              top: H / 2 + cy - size / 2,
              width: size,
              height: size,
              transformStyle: 'preserve-3d',
              transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${spin}deg)`,
            }}
          >
            <svg width={size} height={size} style={{position: 'absolute', overflow: 'visible'}}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={color.hot}
                strokeOpacity={strokeOpacity}
                strokeWidth={stroke}
                strokeDasharray={`${circ * draw} ${circ}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={color.hot}
                strokeWidth={stroke * 1.6}
                strokeLinecap="round"
                strokeDasharray={`${comet} ${circ}`}
                strokeDashoffset={-(f * speed * 6 + i * circ * 0.33)}
                opacity={detail * draw}
                style={{filter: `drop-shadow(0 0 6px ${color.accent}) drop-shadow(0 0 14px ${color.accent})`}}
              />
            </svg>
            {nodes.map((a, k) => {
              const rad = (a * Math.PI) / 180;
              return (
                <div
                  key={k}
                  style={{
                    position: 'absolute',
                    left: size / 2 + Math.cos(rad) * r - 6,
                    top: size / 2 + Math.sin(rad) * r - 6,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: color.ink,
                    border: `1.5px solid ${color.hot}`,
                    boxShadow: `0 0 12px ${color.accent}`,
                    opacity: detail * (draw > (a / 360 + 0.25) % 1 ? 1 : draw),
                    transform: `rotateZ(${-spin}deg) rotateY(${-ry}deg) rotateX(${-rx}deg)`,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </>
  );
};

/** Energy core: morphs from the collapsed glass tile into a sphere of light. */
export const Core: React.FC<{w: number; h: number; radius: number; intensity: number; cy?: number; opacity?: number}> = ({w, h, radius, intensity, cy = 0, opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      left: W / 2 - w / 2,
      top: H / 2 + cy - h / 2,
      width: w,
      height: h,
      borderRadius: radius,
      opacity,
      background: `radial-gradient(circle at 42% 38%, #ffffff 0%, ${color.hot} 22%, ${color.accent} 60%, rgba(90,130,230,0.9) 100%)`,
      boxShadow: `0 0 ${40 * intensity}px rgba(143,184,255,0.9), 0 0 ${140 * intensity}px rgba(143,184,255,0.45), 0 0 ${320 * intensity}px rgba(110,150,255,0.22)`,
    }}
  />
);
