import React from 'react';
import {Composition} from 'remotion';
import {Meridian} from './Meridian';
import {DURATION, FPS, H, W} from './theme';

export const RemotionRoot: React.FC = () => (
  <Composition id="Meridian" component={Meridian} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
);
