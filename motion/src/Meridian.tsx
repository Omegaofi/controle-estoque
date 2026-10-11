import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Backdrop, Grain, Vignette} from './components/Atmosphere';
import {Hud} from './components/Hud';
import {Signal} from './scenes/Signal';
import {Architecture} from './scenes/Architecture';
import {Scale} from './scenes/Scale';
import {Resolve} from './scenes/Resolve';
import {SCENES} from './theme';

export const Meridian: React.FC = () => (
  <AbsoluteFill style={{background: '#04050A', overflow: 'hidden'}}>
    <Backdrop />
    {/* Architecture sits beneath Signal so the camera pushes through the type into it. */}
    <Sequence from={SCENES.architecture.from} durationInFrames={SCENES.architecture.dur} name="02 Architecture">
      <Architecture />
    </Sequence>
    <Sequence from={SCENES.signal.from} durationInFrames={SCENES.signal.dur} name="01 Signal">
      <Signal />
    </Sequence>
    <Sequence from={SCENES.scale.from} durationInFrames={SCENES.scale.dur} name="03 Scale">
      <Scale />
    </Sequence>
    <Sequence from={SCENES.resolve.from} durationInFrames={SCENES.resolve.dur} name="04 Resolve">
      <Resolve />
    </Sequence>
    <Hud />
    <Vignette />
    <Grain />
  </AbsoluteFill>
);
