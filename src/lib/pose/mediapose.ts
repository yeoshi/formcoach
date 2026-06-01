import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import type { Landmark } from "./types";

export type PoseResultsCallback = (landmarks: Landmark[]) => void;

export function initPose(
  videoElement: HTMLVideoElement,
  onResults: PoseResultsCallback
): () => void {
  const pose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
  });

  pose.onResults((results) => {
    if (results.poseLandmarks) {
      const landmarks: Landmark[] = results.poseLandmarks.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z ?? 0,
        visibility: lm.visibility ?? 1,
      }));
      onResults(landmarks);
    }
  });

  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await pose.send({ image: videoElement });
    },
    width: 640,
    height: 480,
  });

  camera.start();

  return () => {
    camera.stop();
    pose.close();
  };
}
