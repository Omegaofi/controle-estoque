import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camera, Layer} from '../components/Camera';
import {KineticText, Label} from '../components/KineticText';
import {Particles, PerspectiveGrid} from '../components/Atmosphere';
import {GlassStack} from '../components/GlassStack';
import {color, ease, font, springs} from '../theme';
import {keys, mix, ramp, springAt} from '../lib/motion';

export const COLLAPSED_SCALE = 0.22;

/** 02 — Glass layers arrive from depth, separate, and finally compress into a single tile of light. */
export const Architecture: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Camera drifts laterally for parallax and returns to identity for the hand-off.
  const camX = keys(f, [0, 90, 116], [70, -40, 0]);
  const camZ = keys(f, [0, 90, 116], [-60, 40, 0]);
  const camRy = keys(f, [0, 90, 116], [2.4, -1.6, 0]);

  // Arrival from deep space.
  const arrive = springAt(f, fps, 10, springs.heavy);
  const collapse = ramp(f, [86, 114], [0, 1], ease.inOut);

  const gaps = [0, 1, 2, 3, 4].map((i) => springAt(f, fps, 24 + i * 3, {damping: 14, stiffness: 80, mass: 1}) * i * 74 * (1 - collapse));
  const rx = mix(58, 0, collapse);
  const rz = mix(-34 - (1 - arrive) * 40 + f * 0.07, 0, collapse);
  const stackZ = mix(-2400, 0, arrive);
  const x = mix(330, 0, collapse);
  const y = mix(30, 0, collapse);
  const scale = mix(1, COLLAPSED_SCALE, collapse);
  const fadeAtEnd = 1 - ramp(f, [110, 119], [0, 1], ease.soft);

  const env = ramp(f, [6, 40]) * (1 - ramp(f, [80, 106], [0, 1], ease.in));

  return (
    <AbsoluteFill>
      <Camera x={camX} z={camZ} ry={camRy} perspective={1500}>
        <Layer>
          <PerspectiveGrid opacity={0.9 * env} />
        </Layer>
        <Particles opacity={env} seed="arch" />
        <Layer>
          <GlassStack
            gap={gaps}
            x={x}
            y={y}
            z={stackZ}
            rx={rx}
            rz={rz}
            scale={scale}
            detail={1 - ramp(f, [84, 100], [0, 1], ease.in)}
            energy={ramp(f, [92, 114], [0, 1], ease.in)}
            opacity={fadeAtEnd}
            delay={22}
          />
        </Layer>
        <Layer z={60}>
          <div style={{position: 'absolute', left: 150, top: 318}}>
            <Label text="02 / Architecture" delay={26} exitAt={80} />
            <div style={{height: 34}} />
            <KineticText lines={['Every layer,', 'considered.']} accent={['considered.']} size={124} delay={27} stagger={5} exitAt={80} />
            <div style={{height: 40}} />
            <KineticText
              lines={['Five coupled systems,', 'one coherent surface.']}
              size={28}
              weight={400}
              lineHeight={1.4}
              family={font.text}
              tracking={-0.005}
              fill={color.dim}
              delay={48}
              stagger={2}
              tilt={0}
              exitAt={78}
              exitStagger={1}
            />
          </div>
        </Layer>
      </Camera>
    </AbsoluteFill>
  );
};
