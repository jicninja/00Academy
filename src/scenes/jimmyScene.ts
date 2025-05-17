import * as THREE from 'three';
import { GenericScene } from './genericScene';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

type SkinnedAnimation = {
  clip: THREE.AnimationClip;
  model: THREE.Scene;
};

export class JimmyScene extends GenericScene {
  private cannonModel?: THREE.Scene;
  private jimmyModel?: THREE.Scene;
  private isIntroDone = false;
  public camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock = new THREE.Clock();
  private onCompleteCallback?: () => void;
  private skinnedAnim?: SkinnedAnimation;

  constructor(renderer: THREE.WebGLRenderer) {
    super();
    this.renderer = renderer;

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    this.camera.position.set(0, 0, 5);
    this.scene.add(this.camera);

    this.scene.background = new THREE.Color(0xffffff);
    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
    directionalLight.castShadow = true;
    directionalLight.position.set(5, 15, 5);

    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.radius = 10;
    this.scene.add(directionalLight);

    this.initScene();

    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 1 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.75;
    floor.receiveShadow = true;

    this.scene.add(floor);
  }

  private async initScene() {
    const loader = new GLTFLoader();

    await this.loadCannonModel(loader);
    await this.loadJimmyModel(loader);
  }

  private async loadCannonModel(loader: GLTFLoader) {
    loader.load('./assets/cannon.glb', (gltf) => {
      const model = gltf.scene as THREE.Scene;

      this.cannonModel = model;
      this.cannonModel.lookAt(0, 0, 0);

      const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
      });

      const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);

      const updateEnvMap = () => {
        cubeCamera.position.copy(new THREE.Vector3(0, 0, -2));
        cubeCamera.update(this.renderer, this.scene);
      };

      updateEnvMap();
      this.renderer.setAnimationLoop(updateEnvMap);

      this.cannonModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          this.setupCannonMaterials(child, cubeRenderTarget.texture);
        }
      });

      this.scene.add(cubeCamera);

      this.scene.add(this.cannonModel);
    });
  }

  private async setupCannonMaterials(
    child: THREE.Mesh,
    texture: THREE.Texture
  ) {
    const reflectiveMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x000000),
      envMap: texture,
      metalness: 1.65,
      roughness: child.name === 'CannonInside' ? 0 : 0.2,
      envMapIntensity: 2,
      reflectivity: 0.4,
      ior: 1.5,
      side: THREE.DoubleSide,
    });

    child.material = reflectiveMaterial;
  }

  private loadJimmyModel(loader: GLTFLoader) {
    loader.load('./assets/jimmy.glb', (gltf) => {
      const model = gltf.scene;

      this.jimmyModel = model;

      model.scale.set(0.175, 0.175, 0.175);
      model.position.set(0, -1.75, -5);
      model.rotation.set(0, Math.PI / -2, 0);

      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          this.setupJimmyMaterials(child);
        }
      });

      if (gltf.animations && gltf.animations.length > 0) {
        this.skinnedAnim = {
          clip: gltf.animations[0],
          model,
        };
      }

      this.scene.add(model);
    });
  }

  private setupJimmyMaterials(child: THREE.Mesh) {
    if (
      child.material instanceof THREE.MeshStandardMaterial &&
      child.name !== 'explosion'
    ) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  }

  public play() {
    if (this.skinnedAnim) {
      this.playAnimation(this.skinnedAnim);
    }
  }

  private playAnimation({ clip, model }: SkinnedAnimation) {
    const mixer = new THREE.AnimationMixer(model);
    const action = mixer.clipAction(clip);

    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.play();

    const updateAnimation = () => {
      if (mixer.time >= action.getClip().duration && !this.isIntroDone) {
        const interval = 2000;

        if (this.jimmyModel) {
          const animationClock = new THREE.Clock(); // Isolated clock for animation
          const animateMaterial = () => {
            this.jimmyModel!.traverse((child) => {
              if (
                child instanceof THREE.Mesh &&
                child.material instanceof THREE.MeshStandardMaterial
              ) {
                const elapsedTime = animationClock.getElapsedTime();
                child.material.metalness = Math.abs(elapsedTime * 2); // Increment metalness over time
              }
            });

            if (this.jimmyModel?.children[1].material.metalness < 2) {
              requestAnimationFrame(animateMaterial);
            }
          };

          animateMaterial();
        }

        this.isIntroDone = true;

        this.animateIntroCamera(55, 1, interval);

        setTimeout(() => {
          if (this.onCompleteCallback) {
            this.onCompleteCallback();
          }
        }, interval);
      }

      if (!this.isIntroDone) {
        mixer.update(this.clock.getDelta());
        requestAnimationFrame(updateAnimation);
      }
    };

    updateAnimation();
  }

  public onAnimationComplete(callback: () => void) {
    this.onCompleteCallback = callback;
  }
}
