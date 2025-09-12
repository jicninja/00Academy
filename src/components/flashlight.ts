import * as THREE from 'three';
import { createVector3Smoother } from '../utils/smoother';

export class Flashlight {
  public light: THREE.SpotLight;
  public position = new THREE.Vector3(-1.5, -0.5, 6);
  private smoother = createVector3Smoother(0.9);

  constructor() {
    this.light = new THREE.SpotLight(0xffffff, 20, 50, Math.PI / 5, 0.5, 0.5);
    this.light.position.copy(this.position);
    this.light.target.position.set(0, 0, 0);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(2048, 2048); // Aumentar resolución de sombras
    this.light.shadow.radius = 4; // Suavizar bordes de sombras
    
    // Configurar cámara de sombras para mejor calidad
    this.light.shadow.camera.near = 0.1;
    this.light.shadow.camera.far = 50;
    this.light.shadow.bias = -0.0005; // Reducir acné de sombras
  }

  setPosition(position: THREE.Vector3) {
    this.position = this.smoother(position);
  }

  update() {
    this.light.position.lerp(this.position, 0.5);
  }

  dispose() {
    // Dispose of shadow map
    if (this.light.shadow && this.light.shadow.map) {
      this.light.shadow.map.dispose();
    }
    
    // Remove light from parent if it has one
    if (this.light.parent) {
      this.light.parent.remove(this.light);
    }
  }
}
