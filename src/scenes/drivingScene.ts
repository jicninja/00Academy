import { GenericScene } from './genericScene';
import * as THREE from 'three';
import { createVector3Smoother } from '../utils/smoother';
import { Wall } from '../components/walls';
import { type BothHandsCallbackOptions } from '../detectors/handsDetector';
import { HandHelper } from '../components/hand';
import { Car } from '../components/car';

export class DrivingScene extends GenericScene {
  public camera: THREE.PerspectiveCamera;
  private walls: Wall[] = [];
  private centerLine!: THREE.Mesh;
  private speed: number = 0.5;
  private time: number = 0;
  private steeringInput: number = 0;
  
  public leftHandObject: HandHelper;
  public rightHandObject: HandHelper;
  
  // Car component
  public car: Car;
  
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
      0.1, // Near plane - hands should be visible from Z=-1
      1000
    );
    
    this.scene.background = new THREE.Color(0x000000);
    
    this.camera.position.set(0, 1.5, 0);
    this.camera.lookAt(0, 1.5, -10);
    
    this.setupLights();
    this.createTronEnvironment();
    this.createHandIndicators();
    this.initializeHands();
    this.initializeCar();
    this.scene.fog = new THREE.Fog(0x000000, 10, 100);
  }
  
  private setupLights(): void {
    this.scene.add(new THREE.AmbientLight(0x00ff00, 0.3));
    
    // Add white light for better hand visibility
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    
    const headLight = new THREE.SpotLight(0x00ff00, 30, 100, Math.PI / 6, 0.3, 1);
    headLight.position.set(0, 1, 0);
    headLight.target.position.set(0, 0, -20);
    this.camera.add(headLight);
    
    // Add directional light for hands
    const handLight = new THREE.DirectionalLight(0xffffff, 0.8);
    handLight.position.set(0, 2, 1);
    this.scene.add(handLight);
    
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

  private initializeCar(): void {
    this.car = new Car();
    this.scene.add(this.car.mesh);
  }
  
  public update(cameraPos: THREE.Vector3): void {
    const deltaTime = 0.016;
    this.time += deltaTime;
    
    // Update car
    this.car.update(deltaTime);
    this.car.setSteeringInput(this.steeringInput);
    
    // Get car position for camera following
    const carPos = this.car.getPosition();
    const carRotation = this.car.getRotation();
    
    // Camera follows car with offset
    const cameraOffset = new THREE.Vector3(0, 2, 5); // Behind and above the car
    const rotatedOffset = cameraOffset.clone();
    rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carRotation);
    
    const targetCameraPos = carPos.clone().add(rotatedOffset);
    
    // Add head tracking influence
    const smoothedHeadPos = this.headPositionSmoother(cameraPos);
    const headInfluence = 0.3;
    targetCameraPos.x += smoothedHeadPos.x * headInfluence;
    targetCameraPos.y += smoothedHeadPos.y * 0.2;
    
    // Smooth camera movement
    this.camera.position.lerp(targetCameraPos, 0.1);
    
    // Camera looks at car with slight forward offset
    const lookAtTarget = carPos.clone();
    lookAtTarget.y += 1;
    lookAtTarget.z -= 2; // Look slightly ahead of the car
    this.camera.lookAt(lookAtTarget);
    
    // Update hand objects
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
      
      // Debug: Force position the left hand to be visible
      this.leftHandObject.meshGroup.position.set(-1, 1, -2);
      this.leftHandObject.meshGroup.scale.set(0.5, 0.5, 0.5);
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
      
      // Debug: Force position the right hand to be visible
      this.rightHandObject.meshGroup.position.set(1, 1, -2);
      this.rightHandObject.meshGroup.scale.set(0.5, 0.5, 0.5);
    }
    
    if (handsData.rightHand && handsData.leftHand) {
      const rightWrist = handsData.rightHand.wristPos;
      const leftWrist = handsData.leftHand.wristPos;
      
      const steeringAmount = (rightWrist.x - leftWrist.x) / window.innerWidth;
      this.setSteeringInput(steeringAmount);
      
      // Use Z distance for speed control (Z is now in camera space: -1 to -3)
      const avgZDistance = (rightWrist.z + leftWrist.z) / 2;
      const normalizedZ = (Math.abs(avgZDistance) - 1) / 2; // Normalize -1 to -3 range to 0-1
      const zSpeedModifier = Math.max(0.3, Math.min(1.5, 1 + normalizedZ));
      this.car.setSpeedMultiplier(zSpeedModifier);
      
    } else if (handsData.rightHand) {
      const steering = (handsData.rightHand.wristPos.x - window.innerWidth/2) / window.innerWidth;
      this.setSteeringInput(steering * 0.5);
      
      // Single hand Z control (Z is now in camera space: -1 to -3)
      const normalizedZ = (Math.abs(handsData.rightHand.wristPos.z) - 1) / 2;
      const zSpeedModifier = Math.max(0.5, Math.min(1.2, 1 + normalizedZ * 0.5));
      this.car.setSpeedMultiplier(zSpeedModifier);
      
    } else if (handsData.leftHand) {
      const steering = (handsData.leftHand.wristPos.x - window.innerWidth/2) / window.innerWidth;
      this.setSteeringInput(steering * 0.5);
      
      // Single hand Z control (Z is now in camera space: -1 to -3)
      const normalizedZ = (Math.abs(handsData.leftHand.wristPos.z) - 1) / 2;
      const zSpeedModifier = Math.max(0.5, Math.min(1.2, 1 + normalizedZ * 0.5));
      this.car.setSpeedMultiplier(zSpeedModifier);
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
      
      // Use Z distance for depth-based scaling (Z is now in camera space: -1 to -3)
      const normalizedZ = (Math.abs(leftHandPos.z) - 1) / 2;
      const zScale = Math.max(0.6, Math.min(1.4, 1 + normalizedZ * 0.8));
      const indicatorSize = 90 * zScale;
      
      this.leftHandIndicator.style.left = `${smoothedLeftPos.x}px`;
      this.leftHandIndicator.style.top = `${smoothedLeftPos.y - wristYOffset}px`;
      this.leftHandIndicator.style.width = `${indicatorSize}px`;
      this.leftHandIndicator.style.height = `${indicatorSize}px`;
    } else {
      this.leftHandIndicator.classList.remove('active');
    }
    
    if (rightHandPos) {
      this.rightHandIndicator.classList.add('active');
      
      const smoothedRightPos = this.rightHandSmoother(rightHandPos);
      const wristYOffset = 100;
      
      // Use Z distance for depth-based scaling (Z is now in camera space: -1 to -3)
      const normalizedZ = (Math.abs(rightHandPos.z) - 1) / 2;
      const zScale = Math.max(0.6, Math.min(1.4, 1 + normalizedZ * 0.8));
      const indicatorSize = 90 * zScale;
      
      this.rightHandIndicator.style.left = `${smoothedRightPos.x}px`;
      this.rightHandIndicator.style.top = `${smoothedRightPos.y - wristYOffset}px`;
      this.rightHandIndicator.style.width = `${indicatorSize}px`;
      this.rightHandIndicator.style.height = `${indicatorSize}px`;
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
    if (this.car) {
      this.car.dispose();
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