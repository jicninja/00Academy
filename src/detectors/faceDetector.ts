import * as faceDetection from '@tensorflow-models/face-detection';
import * as THREE from 'three';

export type DetectFacesOptions = {
  video: HTMLVideoElement;
  camera: THREE.PerspectiveCamera;
};
export class FaceDetector {
  private detector: faceDetection.FaceDetector | null = null;
  private isDetecting = false;
  private animationFrameId: number | null = null;

  async initialize() {
    try {
      this.detector = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
          modelType: 'short',
        }
      );
    } catch (error) {
      console.error('Failed to initialize face detector:', error);
      this.showError('Failed to initialize face tracking. Please check your internet connection.');
      throw error;
    }
  }

  public async detectFaces(
    { video, camera }: DetectFacesOptions,
    callback: (facePosition: THREE.Vector3) => void
  ) {
    if (!this.detector || this.isDetecting) {
      return;
    }

    this.isDetecting = true;

    try {
      const faces = await this.detector.estimateFaces(video);
      const face = faces[0];

      if (face) {
        const { box } = face;

        const faceSize = Math.max(box.xMax - box.xMin, box.yMax - box.yMin);

        const depth = THREE.MathUtils.clamp(10 - faceSize / 50, 2, 20);

        const centerX = box.xMin + (box.xMax - box.xMin) / 2;
        const centerY = box.yMin + (box.yMax - box.yMin) / 2;

        const normX = (centerX / video.videoWidth) * 2 - 1;
        const normY = Math.max(-(centerY / video.videoHeight) * 2 + 1, -0.5);
        const targetZ = camera.position.z + (depth - camera.position.z) * 0.9;

        callback(new THREE.Vector3(-normX * 5, normY * 3, targetZ));
      }

      this.animationFrameId = requestAnimationFrame(() => {
        this.isDetecting = false;
        this.detectFaces({ video, camera }, callback);
      });
    } catch (error) {
      console.error('Face detection error:', error);
      this.isDetecting = false;
      
      // Retry after a delay
      setTimeout(() => {
        this.detectFaces({ video, camera }, callback);
      }, 1000);
    }
  }

  private showError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 140px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(138, 43, 226, 0.9);
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

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.isDetecting = false;
    
    if (this.detector) {
      this.detector = null;
    }
  }
}
