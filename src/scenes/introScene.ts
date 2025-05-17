import * as THREE from 'three';
import { JimmyScene } from './jimmyScene';
import { GenericScene } from './genericScene';

export class IntroScene extends GenericScene {
  public camera: THREE.OrthographicCamera;
  private jimmyScene: JimmyScene;
  private renderTarget: THREE.WebGLRenderTarget;
  private plane: THREE.Mesh;
  private renderer: THREE.WebGLRenderer;
  private startTime: number = 0;

  private fadingCircles: { mesh: THREE.Mesh; createdAt: number }[] = [];
  private fadingCircleStep = 0;

  private circle: THREE.Mesh;
  private circleStartTime: number = 0;
  private circleAnimationDuration: number = 1.5; // seconds
  private circleAnimationDone = false;

  constructor(renderer: THREE.WebGLRenderer) {
    super();

    this.renderer = renderer;
    this.jimmyScene = new JimmyScene(this.renderer);

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.OrthographicCamera(0, width, height, 0, -1, 1);

    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {});
    this.renderTarget.samples = 4;

    // Plane for rendering JimmyScene texture
    const planeGeometry = new THREE.PlaneGeometry(width, height);
    const planeMaterial = new THREE.MeshBasicMaterial({
      map: this.renderTarget.texture,
    });
    this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.plane.position.set(width * 0.5, height / 2, 0);
    this.scene.add(this.plane);

    // Create white circle
    const circleGeometry = new THREE.CircleGeometry(50, 64);
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
    });
    this.circle = new THREE.Mesh(circleGeometry, circleMaterial);
    this.circle.position.set(width + 50, height / 2, 1); // z=1 to appear above plane
    this.scene.add(this.circle);
  }

  private createFadingCircle(x: number, y: number) {
    const fadeCircleGeom = new THREE.CircleGeometry(50, 64);
    const fadeCircleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });

    const fadeCircle = new THREE.Mesh(fadeCircleGeom, fadeCircleMat);
    fadeCircle.position.set(x, y, 0);
    this.scene.add(fadeCircle);
    this.fadingCircles.push({
      mesh: fadeCircle,
      createdAt: performance.now(),
    });
  }

  public update() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const now = performance.now() / 3000;

    if (!this.circleAnimationDone) {
      if (!this.circleStartTime) {
        this.circleStartTime = now;
        this.fadingCircleStep = 0;
      }

      const elapsed = now - this.circleStartTime;
      const progress = Math.min(elapsed / this.circleAnimationDuration, 1);
      const startX = -50;
      const endX = width + 50;
      const currentX = startX + (endX - startX) * progress;
      this.circle.position.set(currentX, height / 2, 0);

      const totalSteps = 4;
      const stepSize = 1 / totalSteps;
      const currentStep = Math.floor(progress / stepSize);

      if (
        currentStep > this.fadingCircleStep &&
        this.fadingCircleStep < totalSteps
      ) {
        this.fadingCircleStep = currentStep;
        this.createFadingCircle(currentX, height / 2);
      }

      const fadeDelay = 500; // ms
      const fadeDuration = 500; // ms

      this.fadingCircles = this.fadingCircles.filter(({ mesh, createdAt }) => {
        const age = performance.now() - createdAt;

        if (age > fadeDelay) {
          const fadeProgress = Math.min((age - fadeDelay) / fadeDuration, 1);
          const newOpacity = 1 - fadeProgress;

          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = newOpacity;

          if (fadeProgress >= 1) {
            this.scene.remove(mesh);
            return false;
          }
        }

        return true;
      });

      if (progress >= 1) {
        this.jimmyScene.play();
        this.circleAnimationDone = true;
        this.scene.remove(this.circle);
        this.startTime = performance.now();
      }

      return;
    }

    if (this.circleAnimationDone) {
      const duration = 1.0;
      const elapsed = (performance.now() - this.startTime) / 4000;
      const t = Math.min(elapsed / duration, 1);
      const startX = width * 2;
      const endX = width / 2;
      const currentX = startX + (endX - startX) * t;
      this.plane.position.set(currentX, height / 2, 0);
    }

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.jimmyScene.scene, this.jimmyScene.camera);
    this.renderer.setRenderTarget(null);
  }

  public onAnimationComplete(callback: () => void) {
    this.jimmyScene.onAnimationComplete(callback);
  }
}
