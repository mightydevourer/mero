import React from "react";
import { AbsoluteFill, Easing, interpolate, Series, useCurrentFrame } from "remotion";
import { ShopBackground } from "./ShopBackground";
import { Bubbles } from "./Bubbles";
import { DotProgress } from "./DotProgress";
import { services, theme } from "./content";

const ITEM_DURATION = 60;
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

const tints = [undefined, "#2b3f66", "#2b3f66", undefined];
const startOffsets = [0, 0.6, 1.4, 0.3];

const ServiceItem: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const service = services[index];

  const titleOpacity = interpolate(frame, [6, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const titleY = interpolate(frame, [6, 22], [22, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const underlineScale = interpolate(frame, [6, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const subOpacity = interpolate(frame, [22, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const subY = interpolate(frame, [22, 38], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

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
            opacity: titleOpacity,
            translate: `0px ${titleY}px`,
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
            scale: underlineScale,
          }}
        />
        <div
          style={{
            fontFamily: "Cairo",
            fontWeight: 600,
            fontSize: 36,
            color: "rgba(255,255,255,0.9)",
            opacity: subOpacity,
            translate: `0px ${subY}px`,
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
