import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { Bubbles } from "./Bubbles";
import { pricing, theme } from "./content";

export const ScenePricing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame: frame - 4, fps, config: { damping: 18 } });

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
            opacity: interpolate(titleIn, [0, 1], [0, 1]),
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
            const rowIn = spring({
              frame: frame - (22 + i * 14),
              fps,
              config: { damping: 18 },
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
                  opacity: interpolate(rowIn, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowIn, [0, 1], [-40, 0])}px)`,
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
