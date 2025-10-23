import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Car {
  public mesh: THREE.Group;
  private speed: number = 0;
  private maxSpeed: number = 2;
  private acceleration: number = 0.5;
  private position: THREE.Vector3;
  private rotation: number = 0;
  private steeringInput: number = 0;
  private maxSteeringAngle: number = Math.PI / 6; // 30 degrees
  
  constructor() {
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3(0, 0, 0);
    this.loadModel();
  }

  private async loadModel(): Promise<void> {
    const loader = new GLTFLoader();
    
    try {
      const gltf = await loader.loadAsync('/assets/aston-martin.glb');
      const carModel = gltf.scene;
      
      
      // Scale and position the car
      //carModel.scale.set(0.8, 0.8, 0.8);
      carModel.position.set(0, 0, 0);
      
      // Apply materials and setup
      carModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Enhance materials if needed
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.metalness = 0.8;
                  mat.roughness = 0.2;
                }
              });
            } else if (child.material instanceof THREE.MeshStandardMaterial) {
              child.material.metalness = 0.8;
              child.material.roughness = 0.2;
            }
          }
        }
      });
      
      this.mesh.add(carModel);
      console.log('Aston Martin loaded successfully');
      
    } catch (error) {
      console.error('Failed to load Aston Martin model:', error);
      // Create a simple box as fallback
      this.createFallbackCar();
    }
  }

  private createFallbackCar(): void {
    const geometry = new THREE.BoxGeometry(2, 0.8, 4);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x444444,
      metalness: 0.8,
      roughness: 0.2
    });
    const fallbackCar = new THREE.Mesh(geometry, material);
    fallbackCar.position.y = 0.4;
    this.mesh.add(fallbackCar);
    
    // Add wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    
    const wheelPositions = [
      { x: -0.8, y: 0.3, z: 1.2 },  // Front left
      { x: 0.8, y: 0.3, z: 1.2 },   // Front right
      { x: -0.8, y: 0.3, z: -1.2 }, // Rear left
      { x: 0.8, y: 0.3, z: -1.2 }   // Rear right
    ];
    
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.rotation.z = Math.PI / 2;
      this.mesh.add(wheel);
    });
  }

  public update(deltaTime: number): void {
    // Auto acceleration
    this.speed = Math.min(this.speed + this.acceleration * deltaTime, this.maxSpeed);
    
    // Apply steering
    const steeringAngle = this.steeringInput * this.maxSteeringAngle;
    this.rotation += steeringAngle * (this.speed / this.maxSpeed) * deltaTime;
    
    // Update position based on speed and rotation
    const moveX = Math.sin(this.rotation) * this.speed * deltaTime;
    const moveZ = -Math.cos(this.rotation) * this.speed * deltaTime;
    
    this.position.x += moveX;
    this.position.z += moveZ;
    
    // Update mesh transform
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;
  }

  public setSteeringInput(input: number): void {
    this.steeringInput = Math.max(-1, Math.min(1, input));
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.maxSpeed = 2 * multiplier;
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public getRotation(): number {
    return this.rotation;
  }

  public getSpeed(): number {
    return this.speed;
  }

  public dispose(): void {
    // Dispose geometries and materials
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

    // Remove from parent if it has one
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}