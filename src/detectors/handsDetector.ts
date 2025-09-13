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

export type BothHandsCallbackOptions = {
  rightHand?: HandCallbackOptions;
  leftHand?: HandCallbackOptions;
};

export class HandsDetector {
  private detector: handPoseDetection.HandDetector | null = null;
  // Right hand smoothers
  private smoothRightIndexPos = createVector3Smoother();
  private smoothRightIndexNormPos = createVector3Smoother();
  private smoothRightWristPos = createVector3Smoother();
  // Left hand smoothers
  private smoothLeftIndexPos = createVector3Smoother();
  private smoothLeftIndexNormPos = createVector3Smoother();
  private smoothLeftWristPos = createVector3Smoother();
  // Legacy single hand smoothers (for backward compatibility)
  private smoothIndexPos = createVector3Smoother();
  private smoothIndexNormPos = createVector3Smoother();
  private smoothWristPos = createVector3Smoother();
  private isDetecting = false;
  private animationFrameId: number | null = null;

  public async initialize() {
    try {
      this.detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
          modelType: 'lite',
          maxHands: 2,
        }
      );
    } catch (error) {
      console.error('Failed to initialize hands detector:', error);
      this.showError('Failed to initialize hand tracking. Please check your internet connection.');
      throw error;
    }
  }

  public async detectHands(
    { video }: DetectHandsOptions,
    callback: (data: HandCallbackOptions) => void
  ) {
    if (!this.detector) return;

    this.isDetecting = true;

    try {
      const hands = await this.detector.estimateHands(video);

      const hand =
        hands.find((itemHand) => itemHand.handedness === 'Right') || hands[0];

      if (!hand) {
        this.animationFrameId = requestAnimationFrame(() => {
          this.isDetecting = false;
          this.detectHands({ video }, callback);
        });
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

      this.animationFrameId = requestAnimationFrame(() => {
        this.isDetecting = false;
        this.detectHands({ video }, callback);
      });
    } catch (error) {
      console.error('Hand detection error:', error);
      this.isDetecting = false;
      
      setTimeout(() => {
        this.detectHands({ video }, callback);
      }, 100);
    }
  }

  public async detectBothHands(
    { video }: DetectHandsOptions,
    callback: (data: BothHandsCallbackOptions) => void
  ) {
    if (!this.detector) {
      return;
    }
    
    if (this.isDetecting) {
      return;
    }
    
    this.isDetecting = true;

    try {
      const hands = await this.detector.estimateHands(video);

      const rightHand = hands.find((hand) => hand.handedness === 'Right');
      const leftHand = hands.find((hand) => hand.handedness === 'Left');

      const result: BothHandsCallbackOptions = {};
      if (rightHand) {
        const wrist = rightHand.keypoints[0];
        const indexFinger = rightHand.keypoints[8];

        const rawScreenWrist = new THREE.Vector3(
          window.innerWidth * (1 - wrist.x / video.videoWidth),
          window.innerHeight * (wrist.y / video.videoHeight),
          0
        );

        const rawScreenIndex = new THREE.Vector3(
          window.innerWidth * (1 - indexFinger.x / video.videoWidth),
          window.innerHeight * (indexFinger.y / video.videoHeight),
          0
        );

        const rawNormalizedIndex = new THREE.Vector3(
          indexFinger.x / video.videoWidth,
          indexFinger.y / video.videoHeight,
          0
        );

        result.rightHand = {
          indexPos: this.smoothRightIndexPos(rawScreenIndex),
          wristPos: this.smoothRightWristPos(rawScreenWrist),
          normalizedIndexPos: this.smoothRightIndexNormPos(rawNormalizedIndex),
          hand: rightHand,
        };
      }

      if (leftHand) {
        const wrist = leftHand.keypoints[0];
        const indexFinger = leftHand.keypoints[8];

        const rawScreenWrist = new THREE.Vector3(
          window.innerWidth * (1 - wrist.x / video.videoWidth),
          window.innerHeight * (wrist.y / video.videoHeight),
          0
        );

        const rawScreenIndex = new THREE.Vector3(
          window.innerWidth * (1 - indexFinger.x / video.videoWidth),
          window.innerHeight * (indexFinger.y / video.videoHeight),
          0
        );

        const rawNormalizedIndex = new THREE.Vector3(
          indexFinger.x / video.videoWidth,
          indexFinger.y / video.videoHeight,
          0
        );

        result.leftHand = {
          indexPos: this.smoothLeftIndexPos(rawScreenIndex),
          wristPos: this.smoothLeftWristPos(rawScreenWrist),
          normalizedIndexPos: this.smoothLeftIndexNormPos(rawNormalizedIndex),
          hand: leftHand,
        };
      }

      callback(result);
      this.animationFrameId = requestAnimationFrame(() => {
        this.isDetecting = false;
        this.detectBothHands({ video }, callback);
      });
    } catch (error) {
      console.error('Both hands detection error:', error);
      this.isDetecting = false;
      
      setTimeout(() => {
        this.detectBothHands({ video }, callback);
      }, 100);
    }
  }

  private showError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 165, 0, 0.9);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 8000);
  }

  public stopDetection(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isDetecting = false;
  }

  public dispose(): void {
    this.stopDetection();
    
    if (this.detector) {
      this.detector = null;
    }
  }
}
