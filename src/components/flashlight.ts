import * as THREE from 'three';
import { createVector3Smoother } from '../utils/smoother';

export class Flashlight {
  public light: THREE.SpotLight;
  public position = new THREE.Vector3(-1.5, -0.5, 6);
  private smoother = createVector3Smoother(0.9);

  constructor() {
    this.light = new THREE.SpotLight(0xffffff, 200, 100, Math.PI / 3.2, 0.2);
    this.light.position.set(this.position.x, this.position.y, this.position.z);
    this.light.target.position.set(0, 0, 0);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024);
  }

  setPosition(position: THREE.Vector3) {
    this.position = this.smoother(position);
  }

  update() {
    this.light.position.set(this.position.x, this.position.y, this.position.z);
  }
}
