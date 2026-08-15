import React from "react";
import { AbsoluteFill, interpolate, Series, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ShopBackground } from "./ShopBackground";
import { Bubbles } from "./Bubbles";
import { DotProgress } from "./DotProgress";
import { services, theme } from "./content";

const ITEM_DURATION = 60;

const tints = [undefined, "#2b3f66", "#2b3f66", undefined];
const startOffsets = [0, 0.6, 1.4, 0.3];

const ServiceItem: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const service = services[index];

  const titleIn = spring({ frame: frame - 6, fps, config: { damping: 18 } });
  const subIn = spring({ frame: frame - 22, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill>
      <ShopBackground
        startFromSeconds={startOffsets[index]}
        zoomFrom={1.05}
        zoomTo={1.18}
        tint={tints[index]}
        panelFromPercent={48}
      />
      <Bubbles seed={`service-${index}`} />
      <DotProgress total={services.length} active={index} />
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
            fontSize: 78,
            color: theme.white,
            opacity: interpolate(titleIn, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleIn, [0, 1], [22, 0])}px)`,
          }}
        >
          {service.title}
        </div>
        <div
          style={{
            width: 110,
            height: 5,
            backgroundColor: theme.gold,
            marginTop: 16,
            marginBottom: 18,
            transform: `scaleX(${interpolate(titleIn, [0, 1], [0, 1])})`,
          }}
        />
        <div
          style={{
            fontFamily: "Cairo",
            fontWeight: 600,
            fontSize: 36,
            color: "rgba(255,255,255,0.9)",
            opacity: interpolate(subIn, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subIn, [0, 1], [16, 0])}px)`,
          }}
        >
          {service.subtitle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const SceneServices: React.FC = () => {
  return (
    <Series>
      {services.map((s, i) => (
        <Series.Sequence key={s.title} durationInFrames={ITEM_DURATION}>
          <ServiceItem index={i} />
        </Series.Sequence>
      ))}
    </Series>
  );
};
