import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as THREE from 'three';
import { TFHandPredictor } from '../ml/tfHandPredictor';

export type DetectFacesOptions = {
  video: HTMLVideoElement;
  camera: THREE.PerspectiveCamera;
};

// Índices de keypoints para Face Mesh
const FACE_MESH_KEYPOINTS = {
  LEFT_EYE_CENTER: 468,      // Centro del ojo izquierdo
  RIGHT_EYE_CENTER: 473,     // Centro del ojo derecho
  NOSE_TIP: 1,               // Punta de la nariz
  LEFT_EYE_OUTER: 33,        // Esquina exterior ojo izquierdo
  LEFT_EYE_INNER: 133,       // Esquina interior ojo izquierdo
  RIGHT_EYE_OUTER: 362,      // Esquina exterior ojo derecho
  RIGHT_EYE_INNER: 263,      // Esquina interior ojo derecho
};

export class FaceDetector {
  private detector: faceLandmarksDetection.FaceLandmarksDetector | null = null;
  private isDetecting = false;
  private animationFrameId: number | null = null;

  // Predictor para suavizar el tracking de ojos
  private eyePositionPredictor = new TFHandPredictor();

  async initialize() {
    try {
      this.detector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
          refineLandmarks: true, // Mejor precisión para ojos e iris
        }
      );
      console.log('Face Mesh detector initialized with eye tracking');
    } catch (error) {
      console.error('Failed to initialize face detector:', error);
      this.showError('Failed to initialize eye tracking. Please check your internet connection.');
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
    const currentTime = performance.now();

    try {
      const predictions = await this.detector.estimateFaces(video, {
        flipHorizontal: false,
      });

      const face = predictions[0];

      if (face && face.keypoints) {
        // Obtener posiciones de los ojos
        const leftEye = face.keypoints[FACE_MESH_KEYPOINTS.LEFT_EYE_INNER];
        const rightEye = face.keypoints[FACE_MESH_KEYPOINTS.RIGHT_EYE_INNER];

        if (leftEye && rightEye) {
          // Calcular centro entre los dos ojos (punto de mira)
          const eyesCenterX = (leftEye.x + rightEye.x) / 2;
          const eyesCenterY = (leftEye.y + rightEye.y) / 2;

          // Calcular distancia entre ojos para estimar profundidad
          const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) +
            Math.pow(rightEye.y - leftEye.y, 2)
          );

          // Profundidad basada en distancia entre ojos (más cerca = ojos más separados)
          const depth = THREE.MathUtils.clamp(500 / eyeDistance, 3, 15);

          // Normalizar coordenadas de pantalla a espacio 3D
          const normX = (eyesCenterX / video.videoWidth) * 2 - 1;
          const normY = -(eyesCenterY / video.videoHeight) * 2 + 1;

          // Crear posición raw
          const rawPosition = new THREE.Vector3(
            -normX * 5,     // Invertir X para mirror effect
            normY * 3,      // Escalar Y
            depth           // Profundidad estimada
          );

          // Aplicar smoothing con TensorFlow predictor
          const smoothedPosition = this.eyePositionPredictor.addPosition(rawPosition, currentTime);

          callback(smoothedPosition);
        }
      } else {
        // Si no detecta rostro, usar predicción
        const predicted = this.eyePositionPredictor.predict(currentTime);
        if (predicted) {
          callback(predicted);
        }
      }

      this.animationFrameId = requestAnimationFrame(() => {
        this.isDetecting = false;
        this.detectFaces({ video, camera }, callback);
      });
    } catch (error) {
      console.error('Face detection error:', error);
      this.isDetecting = false;

      setTimeout(() => {
        this.detectFaces({ video, camera }, callback);
      }, 100);
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

  /**
   * Obtiene información de debug sobre el tracking de ojos
   */
  public getDebugInfo() {
    return this.eyePositionPredictor.getDebugInfo();
  }

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.isDetecting = false;
    this.eyePositionPredictor.reset();

    if (this.detector) {
      this.detector = null;
    }
  }
}
