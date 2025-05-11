import * as THREE from 'three';
import { JimmyScene } from './jimmyScene';
import { GenericScene } from './genericScene';

export class IntroScene extends GenericScene {
  public camera: THREE.OrthographicCamera;
  private jimmyScene: JimmyScene;
  private renderTarget: THREE.WebGLRenderTarget;
  private plane: THREE.Mesh;
  private renderer: THREE.WebGLRenderer;

  constructor(renderer: THREE.WebGLRenderer) {
    super();

    this.renderer = renderer;
    this.jimmyScene = new JimmyScene(this.renderer);

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.OrthographicCamera(0, width, height, 0, -1, 1);

    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    this.renderTarget.setSize(width, height);

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.jimmyScene.scene, this.jimmyScene.camera);
    this.renderer.setRenderTarget(null);

    const planeGeometry = new THREE.PlaneGeometry(width, height);

    const planeMaterial = new THREE.MeshBasicMaterial({
      map: this.renderTarget.texture,
    });

    this.plane = new THREE.Mesh(planeGeometry, planeMaterial);

    this.plane.position.set(width / 2, height / 2, 0);

    this.scene.add(this.plane);
  }

  public update() {
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.jimmyScene.scene, this.jimmyScene.camera);
    this.renderer.setRenderTarget(null);
  }

  public onAnimationComplete(callback: () => void) {
    this.jimmyScene.onAnimationComplete(callback);
  }
}
