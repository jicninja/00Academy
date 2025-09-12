import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export class PhysicsWorld {
  private world: RAPIER.World | null = null;
  private bodies: Map<THREE.Object3D, RAPIER.RigidBody> = new Map();
  private colliders: Map<RAPIER.Collider, THREE.Object3D> = new Map();
  private initialized = false;
  private eventQueue: RAPIER.EventQueue | null = null;
  
  async initialize(): Promise<void> {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -9.8, z: 0 });
    this.world.timestep = 1 / 60;
    
    // Set integration parameters for better collision detection
    this.world.integrationParameters.dt = 1.0 / 60.0;
    this.world.integrationParameters.maxCcdSubsteps = 10;
    this.world.integrationParameters.allowedLinearError = 0.001;
    
    this.eventQueue = new RAPIER.EventQueue(true);
    this.initialized = true;
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  getWorld(): RAPIER.World | null {
    return this.world;
  }
  
  update(deltaTime: number): void {
    if (!this.world || !this.eventQueue) return;
    
    this.world.step(this.eventQueue);
    
    // Process collision events
    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const collider1 = this.world!.getCollider(handle1);
      const collider2 = this.world!.getCollider(handle2);
      
      if (collider1 && collider2) {
        const mesh1 = this.colliders.get(collider1);
        const mesh2 = this.colliders.get(collider2);
        
        if (mesh1 && mesh2 && started) {
          // Dispatch collision event using userData
          if (mesh1.userData.onCollision) {
            mesh1.userData.onCollision(mesh2);
          }
          if (mesh2.userData.onCollision) {
            mesh2.userData.onCollision(mesh1);
          }
        }
      }
    });
    
    // Update Three.js objects based on physics bodies
    this.bodies.forEach((body, mesh) => {
      // Only update dynamic bodies (not static or kinematic)
      if (body.bodyType() === RAPIER.RigidBodyType.Dynamic) {
        const translation = body.translation();
        const rotation = body.rotation();
        
        mesh.position.set(translation.x, translation.y, translation.z);
        mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      }
    });
  }
  
  createSphere(
    mesh: THREE.Mesh, 
    position: THREE.Vector3, 
    radius: number, 
    mass: number = 1,
    restitution: number = 0.8
  ): RAPIER.RigidBody | null {
    if (!this.world) return null;
    
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setCcdEnabled(true) // Enable continuous collision detection
      .setLinearDamping(0.1) // Small damping for more realistic movement
      .setAngularDamping(0.1);
    
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);
    
    const colliderDesc = RAPIER.ColliderDesc.ball(radius)
      .setRestitution(restitution)
      .setFriction(0.3)
      .setDensity(mass / (4/3 * Math.PI * radius * radius * radius)) // Calculate proper density
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    
    const collider = this.world.createCollider(colliderDesc, rigidBody);
    
    this.bodies.set(mesh, rigidBody);
    this.colliders.set(collider, mesh);
    
    return rigidBody;
  }
  
  createBox(
    mesh: THREE.Mesh,
    position: THREE.Vector3,
    halfExtents: THREE.Vector3,
    isStatic: boolean = false,
    restitution: number = 0.5,
    isKinematic: boolean = false
  ): RAPIER.RigidBody | null {
    if (!this.world) return null;
    
    let rigidBodyDesc;
    if (isStatic) {
      rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
    } else if (isKinematic) {
      rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
    } else {
      rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
    }
    
    rigidBodyDesc.setTranslation(position.x, position.y, position.z);
    
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);
    
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      halfExtents.x, 
      halfExtents.y, 
      halfExtents.z
    )
      .setRestitution(restitution)
      .setFriction(0.5)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    
    const collider = this.world.createCollider(colliderDesc, rigidBody);
    
    this.bodies.set(mesh, rigidBody);
    this.colliders.set(collider, mesh);
    
    return rigidBody;
  }
  
  removeBody(mesh: THREE.Object3D): void {
    const body = this.bodies.get(mesh);
    if (body && this.world) {
      // Remove associated colliders from map
      const numColliders = body.numColliders();
      for (let i = 0; i < numColliders; i++) {
        const collider = body.collider(i);
        this.colliders.delete(collider);
      }
      
      this.world.removeRigidBody(body);
      this.bodies.delete(mesh);
    }
  }
  
  applyImpulse(mesh: THREE.Object3D, impulse: THREE.Vector3): void {
    const body = this.bodies.get(mesh);
    if (body) {
      body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
    }
  }
  
  dispose(): void {
    this.bodies.clear();
    this.colliders.clear();
    this.world = null;
    this.eventQueue = null;
    this.initialized = false;
  }
}

// Export singleton instance
export const physicsWorld = new PhysicsWorld();