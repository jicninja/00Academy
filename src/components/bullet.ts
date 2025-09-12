import * as THREE from 'three';
import { physicsWorld } from '../physics/physics';

export class Bullet {
  public mesh: THREE.Mesh;
  private geometry: THREE.SphereGeometry;
  private material: THREE.MeshStandardMaterial;
  private lifeTime: number = 5; // seconds
  private age: number = 0;
  
  constructor(position: THREE.Vector3) {
    this.geometry = new THREE.SphereGeometry(0.05, 16, 16);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });
    
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.name = 'bullet';
    this.mesh.userData.isBullet = true;
  }
  
  update(deltaTime: number): boolean {
    this.age += deltaTime;
    
    // Fade out near end of life (last 20% of lifetime)
    if (this.age > this.lifeTime * 0.8) {
      const fadeProgress = (this.age - this.lifeTime * 0.8) / (this.lifeTime * 0.2);
      const opacity = Math.max(0, 1 - fadeProgress);
      this.material.opacity = opacity;
      this.material.transparent = true;
      
      // Also reduce emissive intensity for fade effect
      this.material.emissiveIntensity = 0.5 * opacity;
    }
    
    // Return false when lifetime is exceeded (bullet should be removed)
    return this.age < this.lifeTime;
  }
  
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    physicsWorld.removeBody(this.mesh);
  }
}

export class BulletManager {
  private bullets: Bullet[] = [];
  private scene: THREE.Scene | null = null;
  
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }
  
  spawnBullet(position: THREE.Vector3, direction: THREE.Vector3, speed: number = 10): void {
    if (!this.scene || !physicsWorld.isInitialized()) return;
    
    const bullet = new Bullet(position);
    this.scene.add(bullet.mesh);
    
    // Create physics body with slightly larger radius to match visual
    const body = physicsWorld.createSphere(
      bullet.mesh, 
      position, 
      0.055, // radius slightly larger than visual (0.05) for better collision
      0.1,   // mass
      0.8    // high restitution for bouncing
    );
    
    if (body) {
      const velocity = direction.clone().multiplyScalar(speed);
      body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
    }
    
    this.bullets.push(bullet);
  }
  
  update(deltaTime: number): void {
    // Update all bullets and remove expired ones
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      if (!bullet.update(deltaTime)) {
        // Remove expired bullet
        if (this.scene) {
          this.scene.remove(bullet.mesh);
        }
        bullet.dispose();
        this.bullets.splice(i, 1);
        
      }
    }
  }
  
  dispose(): void {
    // Clean up all bullets
    this.bullets.forEach(bullet => {
      if (this.scene) {
        this.scene.remove(bullet.mesh);
      }
      bullet.dispose();
    });
    this.bullets = [];
  }
  
  getBulletCount(): number {
    return this.bullets.length;
  }
}

// Export singleton instance
export const bulletManager = new BulletManager();