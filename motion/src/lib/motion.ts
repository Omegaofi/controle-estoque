import {interpolate, spring, useCurrentFrame, useVideoConfig, type SpringConfig, type EasingFunction} from 'remotion';
import {ease, springs} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Clamped, eased interpolation between two frames. */
export const ramp = (
  frame: number,
  input: [number, number],
  output: [number, number] = [0, 1],
  easing: EasingFunction = ease.out,
) => interpolate(frame, input, output, {...clamp, easing});

/** Multi-stop clamped interpolation. */
export const keys = (frame: number, input: number[], output: number[], easing: EasingFunction = ease.inOut) =>
  interpolate(frame, input, output, {...clamp, easing});

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Spring that starts at `delay` frames into the current sequence. */
export const useSpringAt = (delay: number, config: Partial<SpringConfig> = springs.soft) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config});
};

export const springAt = (frame: number, fps: number, delay: number, config: Partial<SpringConfig> = springs.soft) =>
  spring({frame: frame - delay, fps, config});
