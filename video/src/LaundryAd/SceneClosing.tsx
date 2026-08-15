import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ShopBackground } from "./ShopBackground";
import { Bubbles } from "./Bubbles";
import { closing, theme } from "./content";

export const SceneClosing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const nameIn = spring({ frame: frame - 8, fps, config: { damping: 18 } });
  const pillIn = spring({ frame: frame - 28, fps, config: { damping: 14, mass: 0.7 } });
  const addressIn = spring({ frame: frame - 48, fps, config: { damping: 18 } });
  const ctaIn = spring({ frame: frame - 90, fps, config: { damping: 12, mass: 0.7 } });

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
            opacity: interpolate(nameIn, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(nameIn, [0, 1], [20, 0])}px)`,
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
            transform: `scale(${interpolate(pillIn, [0, 1], [0.6, 1])})`,
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
            opacity: interpolate(addressIn, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(addressIn, [0, 1], [16, 0])}px)`,
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
            opacity: interpolate(ctaIn, [0, 1], [0, 1]),
            transform: `scale(${interpolate(ctaIn, [0, 1], [0.85, 1])})`,
          }}
        >
          {closing.cta}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
