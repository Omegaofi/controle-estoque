import React from 'react';
import {AbsoluteFill} from 'remotion';

type CameraProps = {
  children: React.ReactNode;
  x?: number;
  y?: number;
  z?: number; // positive = push in
  rx?: number;
  ry?: number;
  rz?: number;
  perspective?: number;
  style?: React.CSSProperties;
};

/** A real perspective camera: it moves the world so layers at different Z parallax naturally. */
export const Camera: React.FC<CameraProps> = ({children, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, perspective = 1400, style}) => (
  <AbsoluteFill style={{perspective, perspectiveOrigin: '50% 50%', ...style}}>
    <AbsoluteFill
      style={{
        transformStyle: 'preserve-3d',
        transform: `translate3d(${-x}px, ${-y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
      }}
    >
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
);

/** A plane in the camera's world, positioned in 3D. */
export const Layer: React.FC<{children?: React.ReactNode; x?: number; y?: number; z?: number; style?: React.CSSProperties}> = ({
  children,
  x = 0,
  y = 0,
  z = 0,
  style,
}) => (
  <AbsoluteFill style={{transformStyle: 'preserve-3d', transform: `translate3d(${x}px, ${y}px, ${z}px)`, ...style}}>{children}</AbsoluteFill>
);
