import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { ShopBackground } from "./ShopBackground";
import { Bubbles } from "./Bubbles";
import { brand, theme } from "./content";

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [12, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const titleY = interpolate(frame, [12, 30], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  const subOpacity = interpolate(frame, [48, 68], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const subY = interpolate(frame, [48, 68], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const underlineScale = interpolate(frame, [48, 68], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

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
            translate: `0px ${titleY}px`,
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
            scale: underlineScale,
          }}
        />
        <div
          style={{
            fontFamily: "Cairo",
            fontWeight: 600,
            fontSize: 42,
            color: "rgba(255,255,255,0.92)",
            opacity: subOpacity,
            translate: `0px ${subY}px`,
          }}
        >
          {brand.tagline}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
