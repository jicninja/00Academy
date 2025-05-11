import * as THREE from 'three';
import { createVector3Smoother } from '../utils/smoother';

export class Flashlight {
  public light: THREE.SpotLight;
  public position = new THREE.Vector3(-1.5, -0.5, 6);
  private smoother = createVector3Smoother(0.9);

  constructor() {
    this.light = new THREE.SpotLight(0xffffff, 20, 50, Math.PI / 5, 1, 0.5);
    this.light.position.copy(this.position);
    this.light.target.position.set(0, 0, 0);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024);
  }

  setPosition(position: THREE.Vector3) {
    this.position = this.smoother(position);
  }

  update() {
    this.light.position.copy(this.position);
  }
}
