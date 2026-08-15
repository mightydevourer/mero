import React from "react";
import { Audio, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { SceneIntro } from "./SceneIntro";
import { SceneDiscount } from "./SceneDiscount";
import { SceneServices } from "./SceneServices";
import { ScenePricing } from "./ScenePricing";
import { SceneClosing } from "./SceneClosing";
import { FontStyle } from "./FontStyle";

export const LAUNDRY_AD_FPS = 30;

const SCENE_DURATIONS = [120, 120, 240, 150, 150];
const TRANSITION_FRAMES = 15;
const TRANSITION_COUNT = SCENE_DURATIONS.length - 1;

export const LAUNDRY_AD_DURATION =
  SCENE_DURATIONS.reduce((a, b) => a + b, 0) - TRANSITION_COUNT * TRANSITION_FRAMES;

const transition = () => (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
  />
);

export const LaundryAd: React.FC = () => {
  return (
    <>
      <FontStyle />
      <Audio src={staticFile("assets/shop-source.mp4")} volume={0.9} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[0]}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        {transition()}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[1]}>
          <SceneDiscount />
        </TransitionSeries.Sequence>
        {transition()}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[2]}>
          <SceneServices />
        </TransitionSeries.Sequence>
        {transition()}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[3]}>
          <ScenePricing />
        </TransitionSeries.Sequence>
        {transition()}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[4]}>
          <SceneClosing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </>
  );
};
