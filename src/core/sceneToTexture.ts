import * as THREE from 'three';

export class SceneToTexture {
  private renderer: THREE.WebGLRenderer;
  private renderTarget: THREE.WebGLRenderTarget;

  constructor(width: number, height: number) {
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): THREE.Texture {
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);

    return this.renderTarget.texture;
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.renderer.dispose();
  }
}
