import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {color, ease, font, FPS, SCENES} from '../theme';
import {ramp} from '../lib/motion';

const SCENE_NAMES = [
  {from: SCENES.signal.from, name: '01 — Signal'},
  {from: SCENES.architecture.from + 10, name: '02 — Architecture'},
  {from: SCENES.scale.from + 6, name: '03 — Scale'},
  {from: SCENES.resolve.from, name: '04 — Meridian'},
];

const Corner: React.FC<{x: 'left' | 'right'; y: 'top' | 'bottom'; grow: number}> = ({x, y, grow}) => (
  <div style={{position: 'absolute', [x]: 56, [y]: 56, width: 22 * grow, height: 22 * grow}}>
    <div style={{position: 'absolute', [x]: 0, [y]: 0, width: '100%', height: 1, background: color.faint}} />
    <div style={{position: 'absolute', [x]: 0, [y]: 0, width: 1, height: '100%', background: color.faint}} />
  </div>
);

/** Quiet instrument layer: crop marks, timecode, scene index, coordinates. */
export const Hud: React.FC = () => {
  const f = useCurrentFrame();
  const inn = ramp(f, [8, 34]);
  const out = ramp(f, [288, 308], [0, 1], ease.in);
  const o = inn * (1 - out);
  const sec = Math.floor(f / FPS);
  const fr = f % FPS;
  const tc = `00:00:${String(sec).padStart(2, '0')}:${String(fr).padStart(2, '0')}`;
  const current = [...SCENE_NAMES].reverse().find((s) => f >= s.from)!;
  const swap = ramp(f, [current.from, current.from + 14]);
  const text: React.CSSProperties = {fontFamily: font.mono, fontSize: 13, letterSpacing: '0.26em', color: color.faint, textTransform: 'uppercase'};
  return (
    <AbsoluteFill style={{opacity: o, pointerEvents: 'none'}}>
      <Corner x="left" y="top" grow={inn} />
      <Corner x="right" y="top" grow={inn} />
      <Corner x="left" y="bottom" grow={inn} />
      <Corner x="right" y="bottom" grow={inn} />
      <div style={{...text, position: 'absolute', left: 96, top: 60}}>Meridian Systems</div>
      <div style={{...text, position: 'absolute', right: 96, top: 60, fontVariantNumeric: 'tabular-nums'}}>{tc}</div>
      <div style={{position: 'absolute', left: 96, bottom: 58}}>
        <div style={{overflow: 'hidden', height: 18}}>
          <div style={{...text, color: color.dim, transform: `translateY(${(1 - swap) * 100}%)`, opacity: swap}}>{current.name}</div>
        </div>
        <div style={{marginTop: 10, width: 240, height: 1, background: color.hair}}>
          <div style={{width: `${(f / 360) * 100}%`, height: 1, background: color.accent, boxShadow: `0 0 6px ${color.accent}`}} />
        </div>
      </div>
      <div style={{...text, position: 'absolute', right: 96, bottom: 60}}>51°28′38″N · 0°00′05″W</div>
    </AbsoluteFill>
  );
};
