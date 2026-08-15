import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ShopBackground } from "./ShopBackground";
import { Bubbles } from "./Bubbles";
import { closing, theme } from "./content";

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

const fadeUp = (frame: number, start: number, dur = 20) => ({
  opacity: interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  }),
  translate: `0px ${interpolate(frame, [start, start + dur], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  })}px`,
});

export const SceneClosing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pillIn = spring({ frame: frame - 28, fps, config: { damping: 14, mass: 0.7 } });
  const pillScale = interpolate(pillIn, [0, 1], [0.6, 1], { output: "perceptual-scale" });

  const ctaIn = spring({ frame: frame - 90, fps, config: { damping: 12, mass: 0.7 } });
  const ctaOpacity = interpolate(ctaIn, [0, 1], [0, 1]);
  const ctaScale = interpolate(ctaIn, [0, 1], [0.85, 1], { output: "perceptual-scale" });

  return (
    <AbsoluteFill>
      <ShopBackground startFromSeconds={19} zoomFrom={1} zoomTo={1.08} panelFromPercent={36} />
      <Bubbles seed="closing" />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 170,
          direction: "rtl",
        }}
      >
        <div
          style={{
            fontFamily: "Cairo",
            fontWeight: 900,
            fontSize: 74,
            color: theme.white,
            ...fadeUp(frame, 8),
          }}
        >
          {closing.name}
        </div>

        <div
          style={{
            marginTop: 26,
            backgroundColor: theme.gold,
            borderRadius: 999,
            padding: "12px 44px",
            scale: pillScale,
            opacity: interpolate(pillIn, [0, 1], [0, 1]),
          }}
        >
          <div style={{ fontFamily: "Cairo", fontWeight: 800, fontSize: 34, color: theme.navyDark }}>
            {closing.discount}
          </div>
        </div>

        <div
          style={{
            marginTop: 34,
            textAlign: "center",
            ...fadeUp(frame, 48),
          }}
        >
          <div style={{ fontFamily: "Cairo", fontWeight: 800, fontSize: 34, color: theme.white }}>
            {closing.city}
          </div>
          <div style={{ fontFamily: "Cairo", fontWeight: 500, fontSize: 26, color: "rgba(255,255,255,0.85)", marginTop: 6 }}>
            {closing.address}
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            fontFamily: "Cairo",
            fontWeight: 800,
            fontSize: 44,
            color: theme.green,
            opacity: ctaOpacity,
            scale: ctaScale,
          }}
        >
          {closing.cta}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
