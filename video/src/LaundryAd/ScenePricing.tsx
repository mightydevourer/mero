import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { Bubbles } from "./Bubbles";
import { pricing, theme } from "./content";

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

export const ScenePricing: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [4, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  return (
    <AbsoluteFill>
      <GradientBackground />
      <Bubbles seed="pricing" />
      <AbsoluteFill style={{ alignItems: "center", direction: "rtl", paddingTop: 150 }}>
        <div
          style={{
            fontFamily: "Cairo",
            fontWeight: 900,
            fontSize: 64,
            color: theme.white,
            opacity: titleOpacity,
          }}
        >
          {pricing.title}
        </div>
        <div
          style={{
            width: 130,
            height: 5,
            backgroundColor: theme.gold,
            marginTop: 14,
            marginBottom: 44,
          }}
        />

        <div
          style={{
            display: "flex",
            width: 900,
            justifyContent: "space-between",
            paddingInline: 40,
            marginBottom: 12,
          }}
        >
          <div style={{ fontFamily: "Cairo", fontWeight: 700, fontSize: 26, color: theme.goldSoft }}>
            {pricing.columns[0]}
          </div>
          <div style={{ fontFamily: "Cairo", fontWeight: 700, fontSize: 26, color: theme.goldSoft }}>
            {pricing.columns[1]}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: 900 }}>
          {pricing.rows.map((row, i) => {
            const start = 22 + i * 14;
            const rowOpacity = interpolate(frame, [start, start + 18], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: EASE_OUT,
            });
            const rowX = interpolate(frame, [start, start + 18], [-40, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: EASE_OUT,
            });
            return (
              <div
                key={row.item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 18,
                  padding: "22px 34px",
                  opacity: rowOpacity,
                  translate: `${rowX}px 0px`,
                }}
              >
                <div style={{ fontFamily: "Cairo", fontWeight: 800, fontSize: 34, color: theme.white }}>
                  {row.item}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
                  <div style={{ fontFamily: "Cairo", fontWeight: 700, fontSize: 28, color: theme.goldSoft }}>
                    {row.iron}
                  </div>
                  <div style={{ width: 2, height: 30, backgroundColor: "rgba(255,255,255,0.25)" }} />
                  <div style={{ fontFamily: "Cairo", fontWeight: 700, fontSize: 28, color: "#7fe3a8" }}>
                    {row.washIron}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
