import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camera} from '../components/Camera';
import {KineticText, Label} from '../components/KineticText';
import {Core, Orbits, type Ring} from '../components/Orbits';
import {Particles} from '../components/Atmosphere';
import {PANEL_H, PANEL_W} from '../components/GlassStack';
import {COLLAPSED_SCALE} from './Architecture';
import {color, ease, font, springs} from '../theme';
import {keys, mix, ramp, springAt} from '../lib/motion';

export const MARK_R = 100;

const Stat: React.FC<{value: string; label: string; delay: number; exitAt: number}> = ({value, label, delay, exitAt}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = springAt(f, fps, delay, springs.word);
  const out = ramp(f, [exitAt, exitAt + 14], [0, 1], ease.in);
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14}}>
      <div style={{overflow: 'hidden', padding: '0 0.04em 0.1em', margin: '0 -0.04em -0.1em'}}>
        <div
          style={{
            fontFamily: font.display,
            fontWeight: 300,
            fontSize: 76,
            letterSpacing: '-0.04em',
            color: color.text,
            fontVariantNumeric: 'tabular-nums',
            transform: `translateY(${(1 - p) * 110 - out * 110}%)`,
          }}
        >
          {value}
        </div>
      </div>
      <Label text={label} delay={delay + 6} exitAt={exitAt} size={12} />
    </div>
  );
};

/** 03 — The tile becomes a core; orbits draw on around it; then everything converges into one circle. */
export const Scale: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const converge = ramp(f, [66, 92], [0, 1], ease.inOut);
  const tilt = keys(f, [0, 34, 66, 92], [0, -6, -8, 0]);
  const camZ = keys(f, [0, 40, 66, 92], [0, 110, 130, 0]);
  const cy = keys(f, [0, 30, 66, 92], [0, -96, -96, 0]);

  // Core: morph from collapsed glass tile to sphere, then implode into the mark.
  const m = springAt(f, fps, 4, springs.soft);
  const coreScale = 1 - ramp(f, [68, 88], [0, 1], ease.in);
  const pulse = 1 + Math.sin(f * 0.18) * 0.06;
  const w = mix(PANEL_W * COLLAPSED_SCALE, 96, m) * coreScale;
  const h = mix(PANEL_H * COLLAPSED_SCALE, 96, m) * coreScale;
  const radius = mix(22 * COLLAPSED_SCALE, 48, m) * coreScale;

  const base = [
    {r: 214, ry: -16, speed: 0.55, nodes: [20, 200]},
    {r: 318, ry: 10, speed: -0.38, nodes: [110, 250, 330]},
    {r: 430, ry: 28, speed: 0.26, nodes: [60, 170]},
  ];
  const rings: Ring[] = base.map((b, i) => ({
    r: mix(b.r, MARK_R, converge),
    rx: mix(70, 0, converge),
    ry: mix(b.ry, 0, converge),
    spin: f * b.speed * 1.4 + i * 40,
    speed: b.speed,
    draw: ramp(f, [8 + i * 7, 48 + i * 7]),
    nodes: b.nodes,
  }));

  const env = ramp(f, [0, 30]) * (1 - ramp(f, [62, 88], [0, 1], ease.in));
  const counter = ramp(f, [22, 72], [0, 1], ease.out);

  return (
    <AbsoluteFill>
      <Camera z={camZ} rx={tilt} perspective={1500}>
        <Particles opacity={env * 0.8} seed="scale" count={50} />
        <Orbits
          rings={rings}
          detail={1 - converge}
          stroke={mix(1.8, 3, converge)}
          strokeOpacity={mix(0.5, 1, ramp(f, [72, 92]))}
          cy={cy}
        />
        <Core w={w} h={h} radius={radius} intensity={mix(0.6, 1, m) * pulse} cy={cy} opacity={ramp(f, [0, 6], [0, 1], ease.soft)} />
      </Camera>

      <div style={{position: 'absolute', left: 150, bottom: 150}}>
        <Label text="03 / Scale" delay={14} exitAt={62} />
        <div style={{height: 30}} />
        <KineticText lines={['Built to scale.']} accent={['scale.']} size={120} delay={18} stagger={5} exitAt={62} />
        <div style={{height: 18}} />
        <KineticText lines={['Designed to disappear.']} size={40} weight={400} fill={color.dim} tracking={-0.02} delay={32} stagger={3} tilt={3} exitAt={64} />
      </div>

      <div style={{position: 'absolute', right: 150, bottom: 164, display: 'flex', gap: 88}}>
        <Stat value={`${(12.4 * counter).toFixed(1)}B`} label="Events / second" delay={26} exitAt={62} />
        <Stat value={`${mix(24, 0.8, counter).toFixed(1)}ms`} label="P99 latency" delay={32} exitAt={64} />
      </div>
    </AbsoluteFill>
  );
};
