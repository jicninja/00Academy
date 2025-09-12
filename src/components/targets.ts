import * as THREE from 'three';
import { physicsWorld } from '../physics/physics';

// Target dimensions constant
const TARGET_SIZE = new THREE.Vector3(0.5, 0.5, 0.5);

export class Target {
  public mesh: THREE.Mesh;
  private originalColor: number;
  private hitCount: number = 0;
  private physicsBody: any = null;

  constructor(position: THREE.Vector3, color: number = 0x00ff00) {
    const geometry = new THREE.BoxGeometry(TARGET_SIZE.x * 2, TARGET_SIZE.y * 2, TARGET_SIZE.z * 2);
    const material = new THREE.MeshStandardMaterial({ color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.originalColor = color;

    this.mesh.position.copy(position);
    this.mesh.castShadow = this.mesh.receiveShadow = true;

    this.mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    
    // Add collision handler
    this.mesh.userData.onCollision = (other: THREE.Object3D) => {
      this.onHit(other);
    };
    
    // Create physics body
    setTimeout(() => {
      this.createPhysicsBody(position);
    }, 100);
  }
  
  private createPhysicsBody(position: THREE.Vector3): void {
    if (!physicsWorld.isInitialized()) return;
    
    this.physicsBody = physicsWorld.createBox(
      this.mesh,
      position,
      TARGET_SIZE,
      false, // not static
      0.8,   // restitution
      true   // kinematic
    );
  }
  
  private onHit(other: THREE.Object3D): void {
    // Check if hit by bullet (assuming bullets have a specific property or name)
    if (other.name === 'bullet' || other.userData.isBullet) {
      this.hitCount++;
      
      // Flash effect
      const material = this.mesh.material as THREE.MeshStandardMaterial;
      material.emissive = new THREE.Color(0xffffff);
      material.emissiveIntensity = 0.5;
      
      // Scale effect
      this.mesh.scale.multiplyScalar(1.1);
      
      // Reset after a short delay
      setTimeout(() => {
        material.emissive = new THREE.Color(0x000000);
        material.emissiveIntensity = 0;
        this.mesh.scale.set(1, 1, 1);
        
        // Change color after multiple hits
        if (this.hitCount >= 3) {
          material.color.setHex(0xff0000); // Red after 3 hits
        } else if (this.hitCount >= 2) {
          material.color.setHex(0xffff00); // Yellow after 2 hits
        }
      }, 100);
    }
  }
  
  public reset(): void {
    this.hitCount = 0;
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    material.color.setHex(this.originalColor);
  }
}

const getStaticCubePositions = (): THREE.Vector3[] => {
  return [
    { x: -2, y: 2, z: 0 },
    { x: 2, y: 1, z: -1 },
    { x: 0, y: -1, z: 2 },
    { x: 1, y: 2, z: -2 },
    { x: -3, y: 0, z: -10 },
    { x: 3, y: 1, z: -20 },
    { x: 0, y: 0, z: -30 },
    { x: 2, y: 2, z: -40 },
    { x: -2, y: 1, z: -50 },
    { x: 4, y: -1, z: -60 },
    { x: -1, y: 3, z: -70 },
    { x: 1, y: 0, z: -80 },
    { x: -1, y: 3, z: -90 },
  ].map((pos) => new THREE.Vector3(pos.x, pos.y, pos.z));
};

const getRandomCubePositions = (count: number): THREE.Vector3[] => {
  return Array.from(
    { length: count },
    () =>
      new THREE.Vector3(
        THREE.MathUtils.randFloat(-9.5, 9.5),
        THREE.MathUtils.randFloat(-0.5, 9.5),
        THREE.MathUtils.randFloat(-99.5, -0.5)
      )
  );
};

export const initializeTargets = (
  staticCount: number = 13,
  randomCount: number = 100
): Target[] => {
  const staticPositions = getStaticCubePositions().slice(0, staticCount);
  const randomPositions = getRandomCubePositions(randomCount);
  const allPositions = [...staticPositions, ...randomPositions];

  return allPositions.map((position, index) => {
    const target = new Target(position);
    target.mesh.name = `target_${index}`;
    return target;
  });
};
