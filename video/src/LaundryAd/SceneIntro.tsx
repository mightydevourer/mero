import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ShopBackground } from "./ShopBackground";
import { Bubbles } from "./Bubbles";
import { brand, theme } from "./content";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame: frame - 12, fps, config: { damping: 18 } });
  const titleY = interpolate(titleIn, [0, 1], [24, 0]);
  const titleOpacity = interpolate(titleIn, [0, 1], [0, 1]);

  const subIn = spring({ frame: frame - 48, fps, config: { damping: 18 } });
  const subOpacity = interpolate(subIn, [0, 1], [0, 1]);
  const subY = interpolate(subIn, [0, 1], [16, 0]);

  const underlineScale = interpolate(subIn, [0, 1], [0, 1]);

  return (
    <AbsoluteFill>
      <ShopBackground startFromSeconds={0} zoomFrom={1} zoomTo={1.1} panelFromPercent={48} />
      <Bubbles seed="intro" />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 190,
          direction: "rtl",
        }}
      >
        <div
          style={{
            fontFamily: "Cairo",
            fontWeight: 900,
            fontSize: 92,
            color: theme.white,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textAlign: "center",
          }}
        >
          {brand.name}
        </div>
        <div
          style={{
            width: 130,
            height: 5,
            backgroundColor: theme.gold,
            marginTop: 18,
            marginBottom: 22,
            transform: `scaleX(${underlineScale})`,
          }}
        />
        <div
          style={{
            fontFamily: "Cairo",
            fontWeight: 600,
            fontSize: 42,
            color: "rgba(255,255,255,0.92)",
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
          }}
        >
          {brand.tagline}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
