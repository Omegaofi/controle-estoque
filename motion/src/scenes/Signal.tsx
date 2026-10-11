import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Camera, Layer} from '../components/Camera';
import {KineticText} from '../components/KineticText';
import {color, ease, font, H, W} from '../theme';
import {ramp} from '../lib/motion';

const LightLine: React.FC<{y: number; width: number; intensity: number}> = ({y, width, intensity}) => (
  <div
    style={{
      position: 'absolute',
      left: W / 2 - width / 2,
      top: H / 2 + y,
      width,
      height: 1.5,
      background: `linear-gradient(90deg, rgba(143,184,255,0) 0%, rgba(143,184,255,${0.7 * intensity}) 22%, rgba(255,255,255,${intensity}) 50%, rgba(143,184,255,${0.7 * intensity}) 78%, rgba(143,184,255,0) 100%)`,
      boxShadow: `0 0 ${10 * intensity}px rgba(143,184,255,${0.8 * intensity}), 0 0 ${28 * intensity}px rgba(143,184,255,${0.35 * intensity})`,
    }}
  />
);

/** 01 — A point of light becomes a line, the line opens like an aperture, type rises inside it. */
export const Signal: React.FC = () => {
  const f = useCurrentFrame();

  // Camera: slow deliberate push, then accelerates through the type.
  const z = ramp(f, [0, 96], [-80, 60], ease.inOut) + ramp(f, [82, 108], [0, 980], ease.in);
  const y = ramp(f, [0, 96], [10, -6], ease.inOut);
  const exitBlur = ramp(f, [88, 108], [0, 16], ease.in);
  const exitFade = 1 - ramp(f, [94, 108], [0, 1], ease.in);

  // Light: point flare → line → aperture.
  const flare = ramp(f, [0, 7]) * (1 - ramp(f, [8, 42], [0, 0.9], ease.soft));
  const width = ramp(f, [3, 38], [0, 1560]);
  const open = ramp(f, [20, 58], [0, 222], ease.out);
  const lineI = 1 - ramp(f, [30, 70], [0, 0.55], ease.soft);

  return (
    <AbsoluteFill style={{filter: exitBlur > 0.05 ? `blur(${exitBlur}px)` : undefined, opacity: exitFade}}>
      <Camera z={z} y={y}>
        {/* anamorphic flare behind everything */}
        <Layer z={-200}>
          <div
            style={{
              position: 'absolute',
              left: W / 2 - 900,
              top: H / 2 - 40,
              width: 1800,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(closest-side, rgba(170,200,255,0.55), rgba(143,184,255,0.12) 55%, rgba(143,184,255,0))',
              opacity: flare,
              transform: `scaleX(${0.4 + ramp(f, [0, 30]) * 0.8})`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: W / 2 - 120,
              top: H / 2 - 120,
              width: 240,
              height: 240,
              borderRadius: '50%',
              background: 'radial-gradient(closest-side, rgba(255,255,255,0.9), rgba(143,184,255,0.25) 40%, rgba(143,184,255,0))',
              opacity: flare,
            }}
          />
        </Layer>

        <Layer>
          <LightLine y={-open} width={width} intensity={lineI} />
          <LightLine y={open} width={width} intensity={lineI} />
          {/* headline, visible only inside the aperture */}
          <AbsoluteFill
            style={{
              clipPath: `inset(${H / 2 - open}px 0 ${H / 2 - open}px 0)`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <KineticText lines={['Precision is', 'engineered.']} accent={['engineered.']} size={172} delay={24} stagger={5} align="center" />
          </AbsoluteFill>
        </Layer>

        <Layer z={40}>
          <div style={{position: 'absolute', top: H / 2 + 262, width: '100%', display: 'flex', justifyContent: 'center'}}>
            <KineticText
              lines={['The operating layer for intelligent infrastructure.']}
              size={28}
              weight={400}
              family={font.text}
              tracking={-0.005}
              fill={color.dim}
              delay={52}
              stagger={2}
              tilt={0}
            />
          </div>
        </Layer>
      </Camera>
    </AbsoluteFill>
  );
};
