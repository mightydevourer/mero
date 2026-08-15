import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";

type Bubble = {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
};

const BUBBLE_COUNT = 14;

export const Bubbles: React.FC<{ seed?: string }> = ({ seed = "bubbles" }) => {
  const frame = useCurrentFrame();
  const { height, durationInFrames } = useVideoConfig();

  const bubbles = useMemo<Bubble[]>(() => {
    return new Array(BUBBLE_COUNT).fill(0).map((_, i) => {
      const r = (offset: number) => random(`${seed}-${i}-${offset}`);
      return {
        id: i,
        x: r(1) * 100,
        size: 10 + r(2) * 26,
        delay: r(3) * durationInFrames,
        duration: 260 + r(4) * 260,
        drift: (r(5) - 0.5) * 60,
      };
    });
  }, [seed, durationInFrames]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {bubbles.map((b) => {
        const t = ((frame - b.delay) % b.duration + b.duration) % b.duration;
        const progress = t / b.duration;
        const y = interpolate(progress, [0, 1], [height + b.size, -b.size]);
        const x = b.x + Math.sin(progress * Math.PI * 2) * (b.drift / 10);
        const opacity = interpolate(
          progress,
          [0, 0.1, 0.85, 1],
          [0, 0.5, 0.5, 0],
        );

        return (
          <div
            key={b.id}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: y,
              width: b.size,
              height: b.size,
              borderRadius: "50%",
              border: "1.5px solid rgba(255,255,255,0.55)",
              background: "rgba(255,255,255,0.06)",
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
