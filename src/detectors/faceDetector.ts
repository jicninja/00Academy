import * as faceDetection from '@tensorflow-models/face-detection';
import * as THREE from 'three';

export type DetectFacesOptions = {
  video: HTMLVideoElement;
  camera: THREE.PerspectiveCamera;
};

export class FaceDetector {
  private detector: faceDetection.FaceDetector | null = null;

  async init() {
    this.detector = await faceDetection.createDetector(
      faceDetection.SupportedModels.MediaPipeFaceDetector,
      {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
        modelType: 'short',
      }
    );
  }

  public async detectFaces(
    { video, camera }: DetectFacesOptions,
    callback: (facePosition: THREE.Vector3) => void
  ) {
    if (!this.detector) {
      console.error('FaceDetector is not initialized.');
      return;
    }

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
    requestAnimationFrame(() => this.detectFaces({ video, camera }, callback));
  }
}
