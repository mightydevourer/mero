import React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from "remotion";

/**
 * The only footage we have is the client's already-finished ad, which has
 * Arabic captions burned into the bottom ~45% of every shop shot. We show
 * only the clean upper portion of the frame and fully occlude the rest with
 * our own gradient panel (matching the source's own bottom-vignette style)
 * so old and new captions never appear stacked.
 */
export const ShopBackground: React.FC<{
  startFromSeconds: number;
  zoomFrom?: number;
  zoomTo?: number;
  tint?: string;
  panelFromPercent?: number;
}> = ({
  startFromSeconds,
  zoomFrom = 1,
  zoomTo = 1.12,
  tint,
  panelFromPercent = 50,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#05070c", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${interpolate(frame, [0, 600], [zoomFrom, zoomTo], {
            extrapolateRight: "clamp",
          })})`,
        }}
      >
        <OffthreadVideo
          src={staticFile("assets/shop-source.mp4")}
          startFrom={Math.round(startFromSeconds * 30)}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
          }}
        />
      </AbsoluteFill>

      {tint ? (
        <AbsoluteFill style={{ backgroundColor: tint, mixBlendMode: "color", opacity: 0.5 }} />
      ) : null}

      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, rgba(5,7,12,0) 0%, rgba(5,7,12,0.6) ${panelFromPercent}%, rgba(5,7,12,1) ${panelFromPercent + 10}%, #05070c 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
