import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { Bubbles } from "./Bubbles";
import { discountBumper, theme } from "./content";

export const SceneDiscount: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrowIn = spring({ frame: frame - 6, fps, config: { damping: 18 } });
  const badgeIn = spring({ frame: frame - 18, fps, config: { damping: 12, mass: 0.7 } });
  const subtextIn = spring({ frame: frame - 60, fps, config: { damping: 18 } });
  const chipsIn = spring({ frame: frame - 78, fps, config: { damping: 18 } });

  const badgeScale = interpolate(badgeIn, [0, 1], [0.4, 1]);

  return (
    <AbsoluteFill>
      <GradientBackground />
      <Bubbles seed="discount" />
      <AbsoluteFill style={{ alignItems: "center", direction: "rtl" }}>
        <div
          style={{
            marginTop: 190,
            fontFamily: "Cairo",
            fontWeight: 700,
            fontSize: 34,
            color: theme.goldSoft,
            opacity: interpolate(eyebrowIn, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(eyebrowIn, [0, 1], [16, 0])}px)`,
          }}
        >
          {discountBumper.eyebrow}
        </div>

        <div
          style={{
            marginTop: 48,
            width: 340,
            height: 340,
            borderRadius: "50%",
            backgroundColor: theme.gold,
            border: `6px solid ${theme.goldSoft}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${badgeScale})`,
            boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontFamily: "Cairo", fontWeight: 900, fontSize: 88, color: theme.navyDark }}>
            {discountBumper.percent}
          </div>
          <div style={{ fontFamily: "Cairo", fontWeight: 800, fontSize: 40, color: theme.navyDark }}>
            {discountBumper.label}
          </div>
        </div>

        <div
          style={{
            marginTop: 56,
            fontFamily: "Cairo",
            fontWeight: 700,
            fontSize: 34,
            color: theme.white,
            opacity: interpolate(subtextIn, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subtextIn, [0, 1], [16, 0])}px)`,
          }}
        >
          {discountBumper.subtext}
        </div>

        <div
          style={{
            marginTop: 50,
            display: "flex",
            gap: 24,
            opacity: interpolate(chipsIn, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(chipsIn, [0, 1], [16, 0])}px)`,
          }}
        >
          {discountBumper.chips.map((chip) => (
            <div
              key={chip}
              style={{
                width: 132,
                height: 132,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Cairo",
                fontWeight: 700,
                fontSize: 26,
                color: theme.white,
                textAlign: "center",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
