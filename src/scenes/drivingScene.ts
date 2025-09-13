import { GenericScene } from './genericScene';
import * as THREE from 'three';
import { createVector3Smoother } from '../utils/smoother';
import { Wall } from '../components/walls';
import { type BothHandsCallbackOptions } from '../detectors/handsDetector';
import { HandHelper } from '../components/hand';

export class DrivingScene extends GenericScene {
  public camera: THREE.PerspectiveCamera;
  private walls: Wall[] = [];
  private centerLine!: THREE.Mesh;
  private speed: number = 0.5;
  private time: number = 0;
  private steeringInput: number = 0;
  
  public leftHandObject: HandHelper;
  public rightHandObject: HandHelper;
  
  private headPositionSmoother = createVector3Smoother(0.85);
  
  private leftHandSmoother = createVector3Smoother(0.1);
  private rightHandSmoother = createVector3Smoother(0.1);
  private leftHandIndicator!: HTMLDivElement;
  private rightHandIndicator!: HTMLDivElement;
  
  constructor() {
    super();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    this.scene.background = new THREE.Color(0x000000);
    
    this.camera.position.set(0, 1.5, 0);
    this.camera.lookAt(0, 1.5, -10);
    
    this.setupLights();
    this.createTronEnvironment();
    this.createHandIndicators();
    this.initializeHands();
    this.scene.fog = new THREE.Fog(0x000000, 10, 100);
    
    this.leftHandObject = new HandHelper();
    this.rightHandObject = new HandHelper();
  }
  
  private setupLights(): void {
    this.scene.add(new THREE.AmbientLight(0x00ff00, 0.2));
    
    const headLight = new THREE.SpotLight(0x00ff00, 30, 100, Math.PI / 6, 0.3, 1);
    headLight.position.set(0, 1, 0);
    headLight.target.position.set(0, 0, -20);
    this.camera.add(headLight);
    this.scene.add(this.camera);
  }
  
  private createTronEnvironment(): void {
    const wallConfigs = [
      { rotation: [-Math.PI / 2, 0, 0], position: [0, 0, 0] }, // Floor
      { rotation: [Math.PI / 2, 0, 0], position: [0, 20, 0] }, // Ceiling
      { rotation: [0, Math.PI / 2, 0], position: [-30, 10, 0] }, // Left wall
      { rotation: [0, -Math.PI / 2, 0], position: [30, 10, 0] }, // Right wall
    ];

    const wallGeometry = new THREE.PlaneGeometry(100, 100);
    
    this.walls = wallConfigs.map(config => {
      const texture = new THREE.TextureLoader().load('./assets/grid.jpg');
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(5, 5);

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: new THREE.Color(0x00ff00), // Green theme
        emissiveIntensity: 0.1,
      });

      const wallMesh = new THREE.Mesh(wallGeometry, material);
      wallMesh.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
      wallMesh.position.set(config.position[0], config.position[1], config.position[2]);
      wallMesh.receiveShadow = true;
      
      this.scene.add(wallMesh);
      
      return { getMesh: () => wallMesh } as unknown as Wall;
    });
    
    const lineGeometry = new THREE.BoxGeometry(0.5, 0.1, 100);
    const lineMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.8
    });
    
    this.centerLine = new THREE.Mesh(lineGeometry, lineMaterial);
    this.centerLine.position.y = 0.05;
    this.scene.add(this.centerLine);
  }
  
  private createHandIndicators(): void {
    this.leftHandIndicator = document.createElement('div');
    this.leftHandIndicator.className = 'hand-indicator-driving wrist-driving';
    
    this.rightHandIndicator = document.createElement('div');
    this.rightHandIndicator.className = 'hand-indicator-driving wrist-driving';
    const style = document.createElement('style');
    style.textContent = `
      .hand-indicator-driving {
        position: fixed;
        width: 90px;
        height: 90px;
        border-radius: 50%;
        border: 5px solid #0066ff;
        background: rgba(0, 102, 255, 0.1);
        pointer-events: none;
        z-index: 100;
        transform: translate(-50%, -50%);
        display: none;
        box-shadow: 0 0 20px rgba(0, 102, 255, 0.4);
      }
      
      .hand-indicator-driving.active {
        display: block;
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(this.leftHandIndicator);
    document.body.appendChild(this.rightHandIndicator);
  }
  
  private initializeHands(): void {
    this.leftHandObject = new HandHelper();
    this.scene.add(this.leftHandObject.meshGroup);
    
    this.rightHandObject = new HandHelper();
    this.scene.add(this.rightHandObject.meshGroup);
  }
  
  public update(cameraPos: THREE.Vector3): void {
    this.time += 0.016;
        
    const smoothedHeadPos = this.headPositionSmoother(cameraPos);
    
    const headInfluence = 0.6;
    const verticalInfluence = 0.4;
    
    const steeringX = smoothedHeadPos.x * headInfluence;
    const steeringY = smoothedHeadPos.y * verticalInfluence;
    const steeringZ = smoothedHeadPos.z * 0.2;
    
    const targetCameraPos = new THREE.Vector3(
      steeringX + Math.sin(this.time * 2) * 0.02,
      Math.max(0.8, Math.min(2.2, 1.5 + steeringY + Math.sin(this.time * 3) * 0.01)),
      Math.max(-1, Math.min(1, steeringZ))
    );
    
    this.camera.position.lerp(targetCameraPos, 0.12);
    
    this.camera.lookAt(new THREE.Vector3(0, 1.5, -10));
    
    this.leftHandObject.update();
    this.rightHandObject.update();
    const headMovement = Math.abs(smoothedHeadPos.x) + Math.abs(smoothedHeadPos.y);
    this.speed = Math.max(0.3, Math.min(1.0, 0.5 + headMovement * 0.15));
  }
  
  public setSteeringInput(input: number): void {
    this.steeringInput = Math.max(-1, Math.min(1, input));
  }
  
  public setSpeed(newSpeed: number): void {
    this.speed = newSpeed;
  }
  
  public handleBothHands(handsData: BothHandsCallbackOptions): void {
    const leftHandPos = handsData.leftHand?.wristPos;
    const rightHandPos = handsData.rightHand?.wristPos;
    this.updateHandIndicators(leftHandPos, rightHandPos);
    
    if (handsData.leftHand) {
      this.leftHandObject.update2DAim(
        handsData.leftHand.wristPos,
        handsData.leftHand.indexPos,
        this.camera
      );
      
      if (handsData.leftHand.hand) {
        this.leftHandObject.update3DAim(handsData.leftHand.hand);
      }
    }
    
    if (handsData.rightHand) {
      this.rightHandObject.update2DAim(
        handsData.rightHand.wristPos,
        handsData.rightHand.indexPos,
        this.camera
      );
      
      if (handsData.rightHand.hand) {
        this.rightHandObject.update3DAim(handsData.rightHand.hand);
      }
    }
    
    if (handsData.rightHand && handsData.leftHand) {
      const rightWrist = handsData.rightHand.wristPos;
      const leftWrist = handsData.leftHand.wristPos;
      
      const steeringAmount = (rightWrist.x - leftWrist.x) / window.innerWidth;
      this.setSteeringInput(steeringAmount);
      
    } else if (handsData.rightHand) {
      const steering = (handsData.rightHand.wristPos.x - window.innerWidth/2) / window.innerWidth;
      this.setSteeringInput(steering * 0.5);
      
    } else if (handsData.leftHand) {
      const steering = (handsData.leftHand.wristPos.x - window.innerWidth/2) / window.innerWidth;
      this.setSteeringInput(steering * 0.5);
    }
  }
  
  public getInputRequirements() {
    return {
      handsDetection: 'both',
      faceDetection: true,
      keyboardInput: false
    };
  }
  
  public async initializeHandComponents(): Promise<void> {
    try {
      await this.leftHandObject.initialize();
      await this.rightHandObject.initialize();
    } catch (error) {
      console.error('Failed to initialize driving scene hand components:', error);
      throw error;
    }
  }
  
  public updateHandIndicators(leftHandPos?: THREE.Vector3, rightHandPos?: THREE.Vector3): void {
    if (leftHandPos) {
      this.leftHandIndicator.classList.add('active');
      
      const smoothedLeftPos = this.leftHandSmoother(leftHandPos);
      const wristYOffset = 100;
      
      this.leftHandIndicator.style.left = `${smoothedLeftPos.x}px`;
      this.leftHandIndicator.style.top = `${smoothedLeftPos.y - wristYOffset}px`;
    } else {
      this.leftHandIndicator.classList.remove('active');
    }
    
    if (rightHandPos) {
      this.rightHandIndicator.classList.add('active');
      
      const smoothedRightPos = this.rightHandSmoother(rightHandPos);
      const wristYOffset = 100;
      
      this.rightHandIndicator.style.left = `${smoothedRightPos.x}px`;
      this.rightHandIndicator.style.top = `${smoothedRightPos.y - wristYOffset}px`;
    } else {
      this.rightHandIndicator.classList.remove('active');
    }
  }
  
  public dispose(): void {
    if (this.leftHandObject) {
      this.leftHandObject.dispose();
    }
    if (this.rightHandObject) {
      this.rightHandObject.dispose();
    }
    this.walls.forEach(wall => {
      const mesh = wall.getMesh();
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    
    if (this.centerLine) {
      this.centerLine.geometry.dispose();
      if (this.centerLine.material instanceof THREE.Material) {
        this.centerLine.material.dispose();
      }
    }
    if (this.leftHandIndicator && this.leftHandIndicator.parentNode) {
      this.leftHandIndicator.parentNode.removeChild(this.leftHandIndicator);
    }
    if (this.rightHandIndicator && this.rightHandIndicator.parentNode) {
      this.rightHandIndicator.parentNode.removeChild(this.rightHandIndicator);
    }
    
    super.dispose();
  }
}