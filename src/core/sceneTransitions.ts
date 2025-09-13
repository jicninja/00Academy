import * as THREE from 'three';
import type { IntroScene } from '../scenes/introScene';
import type { ShootScene } from '../scenes/shootScene';
import type { DrivingScene } from '../scenes/drivingScene';

type SceneTypes = IntroScene | ShootScene | DrivingScene;

export class SceneTransition {
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private camera: THREE.OrthographicCamera;
  private scene: THREE.Scene;
  private material: THREE.ShaderMaterial;
  public currentScene?: SceneTypes;

  public isAnimation = false;

  constructor() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.rtA = new THREE.WebGLRenderTarget(width, height, {
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    this.rtB = new THREE.WebGLRenderTarget(width, height, {
      colorSpace: THREE.LinearSRGBColorSpace,
    });

    this.rtB.samples = 4;
    this.rtA.samples = 4;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tA: { value: null },
        tB: { value: null },
        mixRatio: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
        `,
      fragmentShader: `
    uniform sampler2D tA;
    uniform sampler2D tB;
    uniform float mixRatio;
    varying vec2 vUv;

    void main() {
      // Sample the textures directly. They are already in linear space.
      vec4 texA = texture2D(tA, vUv);
      vec4 texB = texture2D(tB, vUv);

      vec4 mixed = mix(texA, texB, mixRatio);

      mixed.rgb = pow(mixed.rgb, vec3(1.0/2.2));

      gl_FragColor = vec4(mixed.rgb, mixRatio);
    }`,
      transparent: true,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(quad);
  }

  public setCurrentScene(newScene: SceneTypes) {
    this.currentScene = newScene;
  }

  public fade(
    renderer: THREE.WebGLRenderer,
    sceneIntro: SceneTypes,
    sceneOutro: SceneTypes,
    onComplete?: () => void
  ): void {
    const duration = 2000;
    const start = performance.now();

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.material.uniforms.mixRatio.value = 0;

    this.material.uniforms.tA.value = this.rtA.texture;
    this.material.uniforms.tB.value = this.rtB.texture;

    renderer.setRenderTarget(this.rtA);
    renderer.render(sceneIntro.scene, sceneIntro.camera);

    renderer.setRenderTarget(this.rtB);

    renderer.render(sceneOutro.scene, sceneOutro.camera);

    renderer.setRenderTarget(null);

    const animate = () => {
      this.isAnimation = true;
      const now = performance.now();
      const t = Math.min((now - start) / duration, 1);
      this.material.uniforms.mixRatio.value = t;

      renderer.setRenderTarget(this.rtA);
      renderer.render(sceneIntro.scene, sceneIntro.camera);

      renderer.setRenderTarget(this.rtB);

      renderer.render(sceneOutro.scene, sceneOutro.camera);

      renderer.setRenderTarget(null);

      renderer.render(this.scene, this.camera);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.material.uniforms.tA.value = null;
        this.material.uniforms.tB.value = null;

        renderer.setRenderTarget(this.rtA);

        renderer.setRenderTarget(this.rtB);

        renderer.setRenderTarget(null);

        this.currentScene = sceneOutro;
        this.isAnimation = false;

        onComplete?.();
      }
    };

    animate();
  }

  public render(renderer: THREE.WebGLRenderer) {
    if (!this.currentScene) return;

    renderer.render(
      this.isAnimation ? this.scene : this.currentScene?.scene,
      this.isAnimation ? this.camera : this.currentScene?.camera
    );
  }

  public resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this.currentScene) {
      this.currentScene.updateCamera();
    }
    this.rtA.setSize(width, height);
    this.rtB.setSize(width, height);
  }
}
