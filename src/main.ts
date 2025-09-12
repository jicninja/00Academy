import * as THREE from 'three';

import { ShootScene } from './scenes/shootScene';

import { Flashlight } from './components/flashlight';
import { HandHelper } from './components/hand';
import { bulletManager } from './components/bullet';
import { physicsWorld } from './physics/physics';

import { VideoDetector } from './detectors/video';
import { FaceDetector } from './detectors/faceDetector';
import {
  HandsDetector,
  type HandCallbackOptions,
} from './detectors/handsDetector';

import { SceneTransition } from './core/sceneTransitions';
import { IntroScene } from './scenes/introScene';
import { renderer } from './core/renderer';

const mainScene = new ShootScene();
const flashLight = new Flashlight();

const handObject = new HandHelper();

const videoController = new VideoDetector();
const faceController = new FaceDetector();
const handsController = new HandsDetector();
const sceneManager = new SceneTransition();

const { video } = videoController;

const isDebugging = true;

// Globals

const intro = new IntroScene(renderer.getRenderer());

const cameraPos = new THREE.Vector3(0, 0, 5);

// Store current hand positions for bullet spawning
let currentWristPos: THREE.Vector3 | null = null;
let currentIndexPos: THREE.Vector3 | null = null;
let currentHand: any = null;

const handleDetectHands = (handData: HandCallbackOptions) => {
  const { indexPos, wristPos, normalizedIndexPos, hand } = handData;

  handObject.update2DAim(wristPos, indexPos, mainScene.camera);
  handObject.update3DAim(hand);
  
  // Store positions for bullet spawning
  currentWristPos = wristPos.clone();
  currentIndexPos = indexPos.clone();
  currentHand = hand;

  flashLight.setPosition(
    new THREE.Vector3(
      -normalizedIndexPos.x * 5,
      normalizedIndexPos.y * 3,
      mainScene.camera.position.z
    )
  );
};

const handleDetectFace = (facePosition: THREE.Vector3) => {
  cameraPos.copy(facePosition);
};

let lastTime = 0;

function animate(currentTime: number = 0) {
  const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
  lastTime = currentTime;
  
  if (!isDebugging) {
    intro.update();
  }

  mainScene.update(cameraPos);
  sceneManager.render(renderer.getRenderer());
  flashLight.update();
  handObject.update();
  bulletManager.update(deltaTime);
  if (physicsWorld.isInitialized()) {
    physicsWorld.update(deltaTime);
  }
  
  requestAnimationFrame(animate);
}
// Global cleanup manager
const cleanupFunctions: (() => void)[] = [];

const initialize = async () => {
  try {
    await physicsWorld.initialize();
  } catch (error) {
    console.error('Failed to initialize physics:', error);
  }
  
  // Set bullet manager scene
  bulletManager.setScene(mainScene.scene);

  sceneManager.setCurrentScene(isDebugging ? mainScene : intro);

  if (isDebugging) await handObject.initialize();

  mainScene.scene.add(flashLight.light);
  mainScene.scene.add(handObject.meshGroup);

  document.body.appendChild(renderer.getDomElement());
  window.addEventListener('resize', onWindowResize);
  cleanupFunctions.push(() => window.removeEventListener('resize', onWindowResize));
  
  // Add spacebar listener for shooting
  window.addEventListener('keydown', handleKeyDown);
  cleanupFunctions.push(() => window.removeEventListener('keydown', handleKeyDown));

  try {
    await videoController.initialize();
    await faceController.initialize();
    await handsController.initialize();
  } catch (error) {
    console.error('Failed to initialize detectors:', error);
    // Continue running even if detectors fail
  }

  intro.onAnimationComplete(() => {
    sceneManager.fade(renderer.getRenderer(), intro, mainScene, async () => {
      await handObject.initialize();
    });
  });

  handsController.detectHands({ video }, handleDetectHands);
  faceController.detectFaces(
    { video, camera: mainScene.camera },
    handleDetectFace
  );

  animate();
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.code === 'Space' && currentWristPos && currentIndexPos && currentHand) {
    event.preventDefault();
    
    // Get key hand points
    const wrist = currentHand.keypoints[0];
    const thumb = currentHand.keypoints[4]; // Thumb tip
    const index = currentHand.keypoints[8]; // Index finger tip
    const middle = currentHand.keypoints[12]; // Middle finger tip
    
    // Calculate hand gesture direction using multiple points
    // Primary direction: from wrist through index finger
    const wristToIndex = new THREE.Vector3(
      -(index.x - wrist.x), // Invert X for right hand
      -(index.y - wrist.y), // Invert Y
      (index.z || 0) - (wrist.z || 0)
    ).normalize();
    
    // Secondary direction: from thumb to index (for lateral aim)
    const thumbToIndex = new THREE.Vector3(
      -(index.x - thumb.x), // Invert X for right hand
      -(index.y - thumb.y),
      (index.z || 0) - (thumb.z || 0)
    ).normalize();
    
    // Combine directions for more natural aiming
    const handDirection = new THREE.Vector3()
      .addScaledVector(wristToIndex, 0.7) // Primary influence
      .addScaledVector(thumbToIndex, 0.3) // Secondary influence
      .normalize();
    
    // Apply 100px upward offset to match the wristAimDiv and wristScreenSphere
    const wristYOffset = 100;
    const adjustedWristY = currentWristPos.y - wristYOffset;
    
    // Convert adjusted wrist screen position to world position for spawn point
    const ndcX = (currentWristPos.x / window.innerWidth) * 2 - 1;
    const ndcY = -(adjustedWristY / window.innerHeight) * 2 + 1;
    
    const ndcVector = new THREE.Vector3(ndcX, ndcY, 0.5);
    ndcVector.unproject(mainScene.camera);
    
    const cameraPosition = new THREE.Vector3();
    mainScene.camera.getWorldPosition(cameraPosition);
    
    // Calculate spawn position
    const rayDirection = ndcVector.sub(cameraPosition).normalize();
    const spawnPosition = cameraPosition.clone();
    spawnPosition.addScaledVector(rayDirection, 1.5); // Spawn 1.5 units from camera
    
    // Calculate shooting direction
    // Base direction goes into the screen
    const shootDirection = rayDirection.clone();
    
    // Add hand gesture influence for more intuitive aiming
    const gestureInfluence = 0.5; // Increased influence
    shootDirection.x += handDirection.x * gestureInfluence;
    shootDirection.y += handDirection.y * gestureInfluence;
    shootDirection.z -= 0.2; // Slight forward bias
    shootDirection.normalize();
    
    
    bulletManager.spawnBullet(spawnPosition, shootDirection, 30);
  }
};

const onWindowResize = () => {
  sceneManager.currentScene?.updateCamera();
  sceneManager.resize();
  renderer.resize();
};

// Cleanup function for when the page unloads
const cleanup = () => {
  console.log('Cleaning up resources...');
  
  // Dispose detectors
  videoController.dispose();
  faceController.dispose();
  handsController.dispose();
  
  // Dispose Three.js objects
  mainScene.dispose();
  intro.dispose();
  flashLight.dispose();
  handObject.dispose();
  bulletManager.dispose();
  physicsWorld.dispose();
  
  // Dispose renderer
  renderer.dispose();
  
  // Run all cleanup functions
  cleanupFunctions.forEach(fn => fn());
};

// Handle page unload
window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);

// Handle visibility change to pause/resume
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause detection when page is hidden
    console.log('Page hidden, pausing detectors');
  } else {
    // Resume when visible again
    console.log('Page visible, resuming detectors');
  }
});

initialize().catch(error => {
  console.error('Failed to initialize application:', error);
});
