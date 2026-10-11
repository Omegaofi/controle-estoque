import {Easing} from 'remotion';

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const DURATION = 360;

export const color = {
  ink: '#04050A',
  fog: '#0B0F1A',
  text: '#EEF2F8',
  dim: 'rgba(222,230,244,0.58)',
  faint: 'rgba(210,222,245,0.32)',
  hair: 'rgba(196,214,255,0.16)',
  accent: '#8FB8FF',
  hot: '#E4EEFF',
};

export const font = {
  display: "'Inter Display', 'Inter', sans-serif",
  text: "'Inter', sans-serif",
  mono: "'DejaVu Sans Mono', monospace",
};

export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  soft: Easing.bezier(0.33, 0, 0.2, 1),
};

export const springs = {
  soft: {damping: 20, stiffness: 90, mass: 1},
  word: {damping: 17, stiffness: 120, mass: 0.85},
  snappy: {damping: 15, stiffness: 190, mass: 0.6},
  heavy: {damping: 28, stiffness: 70, mass: 1.4},
};

// Scene windows in global frames (overlaps are the transitions).
export const SCENES = {
  signal: {from: 0, dur: 108},
  architecture: {from: 84, dur: 121},
  scale: {from: 192, dur: 98},
  resolve: {from: 284, dur: 76},
};
