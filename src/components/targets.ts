import * as THREE from 'three';
import { physicsWorld } from '../physics/physics';
import { Destructible } from './destructible';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Target dimensions constant
const TARGET_SIZE = new THREE.Vector3(0.625, 0.625, 0.625);  // 25% más grande
const TARGET_CYLINDER_RADIUS = 0.625;  // Radio del cilindro 25% más grande
const TARGET_CYLINDER_HEIGHT = 1.25;   // Altura total del cilindro 25% más grande
const TARGET_LIFE = 30;
const BULLET_DAMAGE = 10;

export class Target extends Destructible {
  private originalColor: number;
  private physicsBody: any = null;
  private modelLoaded: boolean = false;

  constructor(position: THREE.Vector3, color: number = 0x00ff00) {
    super(TARGET_LIFE);
    
    // Create an empty Group instead of a mesh
    this.mesh = new THREE.Group();
    this.originalColor = color;

    this.maxLife = 50;
    this.life = 50;

    this.mesh.position.copy(position);

    // Rotación base de 90 grados en X para que miren de frente
    // Más pequeñas variaciones aleatorias
    this.mesh.rotation.set(
      Math.PI / 2 + (Math.random() - 0.5) * 0.3,  // 90° base + ±8.5° variación en X
      (Math.random() - 0.5) * 0.4,  // ±0.2 radianes (~±11.5 grados) en Y
      (Math.random() - 0.5) * 0.2   // ±0.1 radianes (~±5.7 grados) en Z
    );
    
    // Load the aim.glb model
    this.loadAimModel();
    
    // Add collision handler
    this.mesh.userData.onCollision = (other: THREE.Object3D) => {
      this.onHit(other);
    };
    
    // Create physics body
    setTimeout(() => {
      this.createPhysicsBody(position);
    }, 100);
  }
  
  private async loadAimModel(): Promise<void> {
    const loader = new GLTFLoader();
    
    try {
      const gltf = await loader.loadAsync('/assets/aim.glb');
      const aimModel = gltf.scene;
      
      // Scale the model to fit our target size (25% más grande)
      aimModel.scale.set(0.625, 0.625, 0.625);
      
      // Apply settings but preserve original textures
      aimModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Clone the original material to preserve textures
          if (child.material) {
            const originalMaterial = child.material as THREE.MeshStandardMaterial;
            child.material = originalMaterial.clone();
            
            // Apply color tint while preserving textures
            const material = child.material as THREE.MeshStandardMaterial;
            material.color.setHex(this.originalColor);
            
            // Quitar luz especular y agregar emisión
            material.metalness = 1;      // Sin efecto metálico
            material.roughness = 10;      // Completamente mate/difuso
            
            // Ensure the model casts and receives shadows
            child.castShadow = true;
            child.receiveShadow = true;
          }
        }
      });
      
      // Replace placeholder geometry with loaded model
      this.mesh.clear();
      this.mesh.add(aimModel);
      
      this.modelLoaded = true;
      
    } catch (error) {
      console.error('Failed to load aim.glb model:', error);
      // Keep the placeholder box geometry as fallback
    }
  }
  
  private createPhysicsBody(position: THREE.Vector3): void {
    if (!physicsWorld.isInitialized()) return;
    
    // Use cylinder collision shape instead of box
    this.physicsBody = physicsWorld.createCylinder(
      this.mesh,
      position,
      TARGET_CYLINDER_HEIGHT / 2,  // halfHeight
      TARGET_CYLINDER_RADIUS,      // radius
      false, // not static
      0.8,   // restitution
      true   // kinematic
    );
  }
  
  private onHit(other: THREE.Object3D): void {
    // Check if hit by bullet
    if (other.name === 'bullet' || other.userData.isBullet) {
      const isDestroyed = this.takeDamage(BULLET_DAMAGE);
      
      if (isDestroyed) {
        // Target is destroyed, remove from scene
        if (this.mesh.parent) {
          this.mesh.parent.remove(this.mesh);
        }
      } else {
        // Flash effect for living targets (only if model is loaded)
        if (this.modelLoaded) {
          this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
              const material = child.material;
              material.emissive = new THREE.Color(0xffffff);
              material.emissiveIntensity = 0.5;
            }
          });
          
          // Scale effect
          this.mesh.scale.multiplyScalar(1.1);
          
          // Reset after a short delay
          setTimeout(() => {
            this.mesh.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                const material = child.material;
                material.emissive = new THREE.Color(0x000000);
                material.emissiveIntensity = 0;
              }
            });
            this.mesh.scale.set(1, 1, 1);
          }, 100);
        }
      }
    }
  }
  
  protected updateAppearance(): void {
    const lifePercentage = this.getLifePercentage();
    
    // Determine color based on life percentage
    let targetColor: number;
    if (lifePercentage > 0.66) {
      targetColor = 0x00ff00; // Green (healthy)
    } else if (lifePercentage > 0.33) {
      targetColor = 0xffff00; // Yellow (damaged)
    } else {
      targetColor = 0xff0000; // Red (critical)
    }
    
    // Update material color only if model is loaded
    if (this.modelLoaded) {
      // Update all materials in the loaded model
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.color.setHex(targetColor);
          child.material.emissive.setHex(targetColor); // Actualizar color emisivo también
        }
      });
    }
  }
  
  protected onDestroy(): void {
    // Remove physics body
    if (this.physicsBody) {
      physicsWorld.removeBody(this.mesh);
    }
    
    // Remove collision handler
    this.mesh.userData.onCollision = null;
    
    // Trigger destruction event for scene cleanup
    this.mesh.userData.isDestroyed = true;
    
    // Optional: Add destruction visual effects (only if model is loaded)
    if (this.modelLoaded) {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const material = child.material;
          material.color.setHex(0x000000);
          material.opacity = 0.5;
          material.transparent = true;
        }
      });
    }
  }
  
  public reset(): void {
    this.life = this.maxLife;
    this.mesh.userData.isDestroyed = false;
    
    // Reset material properties only if model is loaded
    if (this.modelLoaded) {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.color.setHex(this.originalColor);
          child.material.opacity = 1;
          child.material.transparent = false;
        }
      });
    }
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
