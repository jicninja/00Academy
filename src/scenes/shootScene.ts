import { GenericScene } from './genericScene';
import * as THREE from 'three';

import { initializeTargets } from '../components/targets';
import { initializeWalls } from '../components/walls';
import { Flashlight } from '../components/flashlight';
import { HandHelper } from '../components/hand';
import { bulletManager } from '../components/bullet';
import { type HandCallbackOptions } from '../detectors/handsDetector';

export class ShootScene extends GenericScene {
  private walls = initializeWalls();
  public targets = initializeTargets();
  public camera: THREE.PerspectiveCamera;
  
  // Scene-specific components
  private flashLight: Flashlight;
  private handObject: HandHelper;
  
  // Store current hand positions for bullet spawning
  private currentWristPos: THREE.Vector3 | null = null;
  private currentIndexPos: THREE.Vector3 | null = null;
  private currentHand: any = null;
  
  // Input handling
  private keyDownHandler: (event: KeyboardEvent) => void;

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
    
    this.flashLight = new Flashlight();
    this.handObject = new HandHelper();
    
    this.scene.add(this.flashLight.light);
    this.scene.add(this.handObject.meshGroup);
    bulletManager.setScene(this.scene);
  }

  public update(cameraPos: THREE.Vector3) {
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.camera.position.lerp(cameraPos, 0.1);
    
    this.flashLight.update();
    this.handObject.update();
  }
  
  public handleSingleHand(handData: HandCallbackOptions): void {
    const { indexPos, wristPos, normalizedIndexPos, hand } = handData;

    this.handObject.update2DAim(wristPos, indexPos, this.camera);
    this.handObject.update3DAim(hand);
    this.currentWristPos = wristPos.clone();
    this.currentIndexPos = indexPos.clone();
    this.currentHand = hand;

    this.flashLight.setPosition(
      new THREE.Vector3(
        -normalizedIndexPos.x * 5,
        normalizedIndexPos.y * 3,
        this.camera.position.z
      )
    );
  }
  
  public handleKeyInput(event: KeyboardEvent): void {
    if (event.code === 'Space' && this.currentWristPos && this.currentIndexPos && this.currentHand) {
      event.preventDefault();
      
      const spawnPosition = this.handObject.getIndexFingerWorldPosition();
      const shootDirection = this.handObject.getHandAimDirection();
      
      bulletManager.spawnBullet(spawnPosition, shootDirection, 30);
    }
  }
  
  public getInputRequirements() {
    return {
      handsDetection: 'single' as const,
      faceDetection: true,
      keyboardInput: true
    };
  }
  
  public async initializeComponents(): Promise<void> {
    await this.handObject.initialize();
  }
  
  public updateComponents(deltaTime: number): void {
    bulletManager.update(deltaTime);
  }
  
  public dispose(): void {
    this.flashLight.dispose();
    this.handObject.dispose();
    
    super.dispose();
  }
}
