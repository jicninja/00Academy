import * as THREE from 'three';

export abstract class Destructible {
  protected life: number;
  protected maxLife: number;
  public mesh: THREE.Object3D;
  
  constructor(life: number) {
    this.life = life;
    this.maxLife = life;
    this.mesh = new THREE.Object3D(); // Will be overridden by subclasses
  }
  
  public takeDamage(damage: number): boolean {
    this.life = Math.max(0, this.life - damage);
    this.updateAppearance();
    
    if (this.life <= 0) {
      this.onDestroy();
      return true; // Object is destroyed
    }
    
    return false; // Object still alive
  }
  
  public getLife(): number {
    return this.life;
  }
  
  public getMaxLife(): number {
    return this.maxLife;
  }
  
  public getLifePercentage(): number {
    return this.life / this.maxLife;
  }
  
  public isDestroyed(): boolean {
    return this.life <= 0;
  }
  
  // Abstract methods to be implemented by subclasses
  protected abstract updateAppearance(): void;
  protected abstract onDestroy(): void;
}