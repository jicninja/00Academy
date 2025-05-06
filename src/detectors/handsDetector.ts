import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as THREE from 'three';
import { createVector3Smoother } from '../utils/smoother';

export type DetectHandsOptions = {
  video: HTMLVideoElement;
};

export type HandCallbackOptions = {
  indexPos: THREE.Vector3;
  normalizedIndexPos: THREE.Vector3;
  wristPos: THREE.Vector3;
  hand: handPoseDetection.Hand;
};

export class HandsDetector {
  private detector: handPoseDetection.HandDetector | null = null;
  private smoothIndexPos = createVector3Smoother();
  private smoothIndexNormPos = createVector3Smoother();
  private smoothWristPos = createVector3Smoother();

  public async initialize() {
    this.detector = await handPoseDetection.createDetector(
      handPoseDetection.SupportedModels.MediaPipeHands,
      {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        modelType: 'lite',
      }
    );
  }

  public async detectHands(
    { video }: DetectHandsOptions,
    callback: (data: HandCallbackOptions) => void
  ) {
    if (!this.detector) return;

    const hands = await this.detector.estimateHands(video);

    const hand =
      hands.find((itemHand) => itemHand.handedness === 'Left') || hands[0];

    if (!hand) {
      requestAnimationFrame(() => this.detectHands({ video }, callback));
      return;
    }

    const wrist = hand.keypoints[0];
    const indexFinger = hand.keypoints[8];

    const rawScreenWrist = new THREE.Vector3(
      window.innerWidth * (1 - wrist.x / video.videoWidth),
      window.innerHeight * (wrist.y / video.videoHeight),
      0
    );

    const rawScreenIndexFinger = new THREE.Vector3(
      window.innerWidth * (1 - indexFinger.x / video.videoWidth),
      window.innerHeight * (indexFinger.y / video.videoHeight),
      0
    );

    const indexPos = this.smoothIndexPos(rawScreenIndexFinger);
    const wristPos = this.smoothWristPos(rawScreenWrist);

    const normIndexX = -((indexFinger.x / video.videoWidth) * 2 - 1);
    const normIndexY = -(indexFinger.y / video.videoHeight) * 2 + 1;
    const normIndexZ = indexFinger.z ?? 0;

    const normalizedIndexPos = this.smoothIndexNormPos(
      new THREE.Vector3(normIndexX, normIndexY, normIndexZ)
    );

    callback({
      indexPos,
      normalizedIndexPos,
      wristPos,
      hand,
    });

    requestAnimationFrame(() => this.detectHands({ video }, callback));
  }
}
