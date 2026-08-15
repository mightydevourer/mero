import "./index.css";
import { Composition, staticFile } from "remotion";
import {
  CaptionedVideo,
  calculateCaptionedVideoMetadata,
  captionedVideoSchema,
} from "./CaptionedVideo";
import { LaundryAd, LAUNDRY_AD_DURATION, LAUNDRY_AD_FPS } from "./LaundryAd";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LaundryAd"
        component={LaundryAd}
        width={1080}
        height={1920}
        fps={LAUNDRY_AD_FPS}
        durationInFrames={LAUNDRY_AD_DURATION}
      />
      <Composition
        id="CaptionedVideo"
        component={CaptionedVideo}
        calculateMetadata={calculateCaptionedVideoMetadata}
        schema={captionedVideoSchema}
        width={1080}
        height={1920}
        defaultProps={{
          src: staticFile("sample-video.mp4"),
        }}
      />
    </>
  );
};
