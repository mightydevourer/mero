import React from "react";
import { Audio, Series, staticFile } from "remotion";
import { SceneIntro } from "./SceneIntro";
import { SceneDiscount } from "./SceneDiscount";
import { SceneServices } from "./SceneServices";
import { ScenePricing } from "./ScenePricing";
import { SceneClosing } from "./SceneClosing";
import { FontStyle } from "./FontStyle";

export const LAUNDRY_AD_FPS = 30;
export const LAUNDRY_AD_DURATION = 120 + 120 + 240 + 150 + 150; // 780 frames (~26s)

export const LaundryAd: React.FC = () => {
  return (
    <>
      <FontStyle />
      <Audio src={staticFile("assets/shop-source.mp4")} volume={0.9} />
      <Series>
        <Series.Sequence durationInFrames={120}>
          <SceneIntro />
        </Series.Sequence>
        <Series.Sequence durationInFrames={120}>
          <SceneDiscount />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <SceneServices />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <ScenePricing />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <SceneClosing />
        </Series.Sequence>
      </Series>
    </>
  );
};
