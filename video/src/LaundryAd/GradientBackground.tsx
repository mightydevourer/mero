import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "./content";

export const GradientBackground: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 90% at 50% 0%, ${theme.navyLight} 0%, ${theme.navyDark} 55%, #060f24 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(60% 40% at 15% 20%, rgba(224,178,61,0.16) 0%, rgba(224,178,61,0) 70%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(50% 35% at 85% 75%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)",
        }}
      />
    </AbsoluteFill>
  );
};
