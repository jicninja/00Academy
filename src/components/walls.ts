import * as THREE from 'three';
import { physicsWorld } from '../physics/physics';

export class Wall {
  private static wallGeo = new THREE.PlaneGeometry(100, 100);

  public mesh: THREE.Mesh;
  private physicsBody: any = null;

  constructor(rotation: THREE.Euler, position: THREE.Vector3) {
    const texture = new THREE.TextureLoader().load('./assets/grid.jpg');
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      emissiveMap: texture,
      emissive: new THREE.Color(0x00ff00),
      emissiveIntensity: 0.1,
    });

    this.mesh = new THREE.Mesh(Wall.wallGeo, material);
    this.mesh.rotation.copy(rotation);
    this.mesh.position.copy(position);
    this.mesh.receiveShadow = true;
    
    // Create physics body based on wall orientation
    setTimeout(() => {
      this.createPhysicsBody(rotation, position);
    }, 100);
  }
  
  private createPhysicsBody(rotation: THREE.Euler, position: THREE.Vector3): void {
    if (!physicsWorld.isInitialized()) return;
    
    let halfExtents: THREE.Vector3;
    
    // Determine wall orientation from rotation and set appropriate dimensions
    if (Math.abs(rotation.x) > Math.PI / 4) {
      // Floor or ceiling (rotated around X axis)
      halfExtents = new THREE.Vector3(50, 0.7, 50);
    } else {
      // Left or right wall (rotated around Y axis)
      halfExtents = new THREE.Vector3(0.7, 50, 50);
    }
    
    this.physicsBody = physicsWorld.createBox(
      this.mesh,
      position,
      halfExtents,
      true,
      0.8 
    );
  }
  


  getMesh(): THREE.Mesh {
    return this.mesh;
  }
}

export const initializeWalls = (): Wall[] => {
  const wallConfigs = [
    { rotation: [-Math.PI / 2, 0, 0], position: [0, -2, 0] }, // Floor
    { rotation: [Math.PI / 2, 0, 0], position: [0, 10, 0] }, // Ceiling
    { rotation: [0, Math.PI / 2, 0], position: [-10, 4, 0] }, // Left
    { rotation: [0, -Math.PI / 2, 0], position: [10, 4, 0] }, // Right
  ];

  const walls = wallConfigs.map(
    (config) =>
      new Wall(
        new THREE.Euler(...config.rotation),
        new THREE.Vector3(...config.position)
      )
  );

  return walls;
};
