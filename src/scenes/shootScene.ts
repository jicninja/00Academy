import * as THREE from 'three';
import { easeInOutQuad } from '../utils/smoother';

export class ShootScene {
  public scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.AmbientLight(0x00ffff, 0.2));
  }

  public animateIntroCamera = (
    startFOV: number = 0,
    endFOV: number = 50,
    duration: number = 2000
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
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  };
}
