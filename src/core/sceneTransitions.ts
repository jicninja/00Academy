import * as THREE from 'three';
import type { IntroScene } from '../scenes/introScene';
import type { ShootScene } from '../scenes/shootScene';

type SceneTypes = IntroScene | ShootScene;

export class SceneTransition {
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private camera: THREE.OrthographicCamera;
  private scene: THREE.Scene;
  private material: THREE.ShaderMaterial;
  public currentScene?: SceneTypes;
  private _currentScene: THREE.Scene;
  private _currentCamera: THREE.Camera;
  public isAnimation = false;

  constructor() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.rtA = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBFormat,
      stencilBuffer: false,
    });

    this.rtA.texture.colorSpace = THREE.LinearSRGBColorSpace;

    this.rtB = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBFormat,
      stencilBuffer: false,
    });

    this.rtB.texture.colorSpace = THREE.LinearSRGBColorSpace;

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

        vec3 toLinear(vec3 c) {
        return pow(c, vec3(2.2));
        }

        vec3 toSRGB(vec3 c) {
        return pow(c, vec3(0.22));
        }

        void main() {
            vec4 texA = texture2D(tA, vUv);
            vec4 texB = texture2D(tB, vUv);

            vec3 colorA = toLinear(texA.rgb);
            vec3 colorB = toLinear(texB.rgb);

            vec3 blended = mix(colorA, colorB, mixRatio);

            vec3 finalColor = toSRGB(blended);
            gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(quad);

    this._currentScene = new THREE.Scene(); // Initialize with a default
    this._currentCamera = new THREE.PerspectiveCamera(); // Safe fallback
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
    const duration = 1500;
    const start = performance.now();

    // Render scenes to render targets

    renderer.setRenderTarget(this.rtA);
    renderer.render(sceneIntro.scene, sceneIntro.camera);

    renderer.setRenderTarget(this.rtB);
    renderer.render(sceneOutro.scene, sceneOutro.camera);

    renderer.setRenderTarget(null);

    this.material.uniforms.tA.value = this.rtA.texture;
    this.material.uniforms.tB.value = this.rtB.texture;

    const animate = () => {
      this.isAnimation = true;
      const now = performance.now();
      const t = Math.min((now - start) / duration, 1);
      this.material.uniforms.mixRatio.value = t;

      renderer.render(this.scene, this.camera);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.currentScene = sceneOutro;
        this._currentScene = sceneOutro.scene;
        this._currentCamera = sceneOutro.camera;
        this.isAnimation = false;

        onComplete?.();
      }
    };

    animate();
  }

  public render(renderer: THREE.WebGLRenderer) {
    renderer.render(
      this.isAnimation ? this.scene : this._currentScene,
      this.isAnimation ? this.camera : this._currentCamera
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
