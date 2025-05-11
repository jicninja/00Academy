import { GenericScene } from './genericScene';
import * as THREE from 'three';

import { initializeTargets } from '../components/targets';
import { initializeWalls } from '../components/walls';

export class ShootScene extends GenericScene {
  private walls = initializeWalls();
  public targets = initializeTargets();
  public camera: THREE.PerspectiveCamera;

  constructor() {
    super();
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.scene.background = new THREE.Color(0x000000);

    this.scene.add(new THREE.AmbientLight(0x00ffff, 0.2));

    this.targets.forEach((target) => {
      this.scene.add(target.mesh);
    });

    this.walls.forEach((wall) => {
      this.scene.add(wall.mesh);
    });
  }

  public update(cameraPos: THREE.Vector3) {
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.camera.position.lerp(cameraPos, 0.1);
  }
}
