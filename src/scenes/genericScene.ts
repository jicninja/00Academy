import * as THREE from 'three';
import { easeInOutQuad } from '../utils/smoother';

export class GenericScene {
  public scene: THREE.Scene;
  public isIntroAnimating: boolean = true;

  constructor() {
    this.scene = new THREE.Scene();
  }

  public animateIntroCamera = (
    startFOV: number = 0,
    endFOV: number = 50,
    duration: number = 600
  ) => {
    const startTime = performance.now();

    const animate = () => {
      const camera = this.scene.children.find(
        (child) => child instanceof THREE.PerspectiveCamera
      ) as THREE.PerspectiveCamera;

      if (!camera) return;

      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      camera.fov = startFOV + (endFOV - startFOV) * easeInOutQuad(progress);

      camera.updateProjectionMatrix();

      this.isIntroAnimating = camera.fov < endFOV - 1;

      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  };

  public updateCamera() {
    const camera = this.scene.children.find(
      (child) => child instanceof THREE.PerspectiveCamera
    ) as THREE.PerspectiveCamera;

    if (!camera) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  public dispose() {
    // Dispose of all geometries, materials, and textures in the scene
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => {
              this.disposeMaterial(material);
            });
          } else {
            this.disposeMaterial(object.material);
          }
        }
      }
    });

    // Clear the scene
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
  }

  private disposeMaterial(material: THREE.Material) {
    // Dispose textures
    Object.keys(material).forEach((key) => {
      const value = (material as any)[key];
      if (value && typeof value === 'object' && 'dispose' in value) {
        value.dispose();
      }
    });
    
    // Dispose material
    material.dispose();
  }
}
