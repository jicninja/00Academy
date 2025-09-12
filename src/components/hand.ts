import * as THREE from 'three';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { createVector3Smoother } from '../utils/smoother';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const defaultHand = [
  {
    x: 1.6427661699799072,
    y: -0.19020156944192756,
    z: -0.166473388671875,
    name: 'wrist',
  },
  {
    x: 1.2769354542342197,
    y: -0.056832973007334364,
    z: 0.019464492797851562,
    name: 'thumb_cmc',
  },
  {
    x: 0.9790010599044334,
    y: 0.0640668532808889,
    z: 0.06191253662109375,
    name: 'thumb_mcp',
  },
  {
    x: 0.6995394674685966,
    y: 0.22287843739591728,
    z: 0.1546478271484375,
    name: 'thumb_ip',
  },
  {
    x: 0.4942132008818161,
    y: 0.35976225500904213,
    z: 0.105438232421875,
    name: 'thumb_tip',
  },
  {
    x: 1.0322854144123566,
    y: 0.5787921323438753,
    z: -0.022125244140625,
    name: 'index_finger_mcp',
  },
  {
    x: 0.8652211946991455,
    y: 0.8155020325442423,
    z: 0.06641387939453125,
    name: 'index_finger_pip',
  },
  {
    x: 0.7593564165380966,
    y: 0.9811897388657201,
    z: 0.1454925537109375,
    name: 'index_finger_dip',
  },
  {
    x: 0.6847436947372925,
    y: 1.0891758835872283,
    z: 0.44097900390625,
    name: 'index_finger_tip',
  },
  {
    x: 1.2619141314734887,
    y: 0.6958332656880487,
    z: -0.05092620849609375,
    name: 'middle_finger_mcp',
  },
  {
    x: 1.1265928333250057,
    y: 1.0351704991420378,
    z: 0.07373809814453125,
    name: 'middle_finger_pip',
  },
  {
    x: 1.0836947185543548,
    y: 1.1879691294392218,
    z: 0.2935791015625,
    name: 'middle_finger_dip',
  },
  {
    x: 1.007411520704366,
    y: 1.3581665418108573,
    z: 0.5145263671875,
    name: 'middle_finger_tip',
  },
  {
    x: 1.4809902606156837,
    y: 0.7202776194547881,
    z: 0.003964900970458984,
    name: 'ring_finger_mcp',
  },
  {
    x: 1.4291265362498533,
    y: 0.9971688128074278,
    z: 0.1325225830078125,
    name: 'ring_finger_pip',
  },
  {
    x: 1.353815052434541,
    y: 1.1752258799036612,
    z: 0.31402587890625,
    name: 'ring_finger_dip',
  },
  {
    x: 1.2822640163448822,
    y: 1.342780273314344,
    z: 0.535888671875,
    name: 'ring_finger_tip',
  },
  {
    x: 1.6949337569621574,
    y: 0.627803308795916,
    z: 0.0618743896484375,
    name: 'pinky_finger_mcp',
  },
  {
    x: 1.763933695628978,
    y: 0.8358869700690378,
    z: 0.07541656494140625,
    name: 'pinky_finger_pip',
  },
  {
    x: 1.8207584542778503,
    y: 1.032779831345903,
    z: 0.15960693359375,
    name: 'pinky_finger_dip',
  },
  {
    x: 1.8166963977364075,
    y: 1.1729585564693084,
    z: 0.36590576171875,
    name: 'pinky_finger_tip',
  },
];

export class HandHelper {
  private geometry: THREE.SphereGeometry;
  private material: THREE.MeshStandardMaterial;
  private handModel: THREE.Object3D | null = null;
  private handModelLoaded = false;

  // Smoothers for 2D aim
  private wristAimSmoother = createVector3Smoother();
  private indexAimSmoother = createVector3Smoother();

  // Smoothers for 3D hand model
  private handModelPositionSmoother = createVector3Smoother(0.15);
  private handModelRotationSmoother = createVector3Smoother(0.1);
  
  private wristAimPos: THREE.Vector3 = new THREE.Vector3();
  private indexAimPos: THREE.Vector3 = new THREE.Vector3();
  
  // Target positions for hand model
  private targetHandPosition: THREE.Vector3 = new THREE.Vector3();
  private targetHandRotation: THREE.Euler = new THREE.Euler();

  private wristAimDiv: HTMLDivElement;
  private indexAimDiv: HTMLDivElement;

  // Screen space wrist sphere
  private wristScreenSphere: THREE.Mesh;
  private wristScreenSphereSmoother = createVector3Smoother(0.1);
  private wristScreenPosition: THREE.Vector3 = new THREE.Vector3();
  private currentCamera: THREE.Camera | null = null;

  public meshGroup: THREE.Group;
  public points: {
    smoother: ReturnType<typeof createVector3Smoother>;
    mesh: THREE.Mesh;
    position: THREE.Vector3;
  }[];
  
  private showPoints = true; // Toggle to show/hide point spheres

  constructor() {
    this.geometry = new THREE.SphereGeometry(0.05, 16, 16);
    this.material = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.2
    });

    this.wristAimDiv = document.createElement('div');
    this.indexAimDiv = document.createElement('div');

    this.meshGroup = new THREE.Group();

    // Create screen space wrist sphere
    const sphereGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.3
    });
    this.wristScreenSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.wristScreenSphere.renderOrder = 999;
    this.meshGroup.add(this.wristScreenSphere);

    this.points = this.createHandPoints();
    this.loadHandModel();
  }

  private createHandPoints() {
    return defaultHand.map((point) => {
      const smoother = createVector3Smoother();

      const mesh = new THREE.Mesh(this.geometry, this.material);

      const position = new THREE.Vector3(point.x, point.y, point.z);

      mesh.position.copy(position);

      mesh.name = point.name;
      mesh.visible = this.showPoints;

      this.meshGroup.add(mesh);

      return {
        smoother,
        mesh,
        position,
      };
    });
  }

  public update() {
    const indexSmoothed = this.indexAimSmoother(this.indexAimPos);
    const wristSmoothed = this.wristAimSmoother(this.wristAimPos);

    // Apply 100px upward offset to wrist position
    const wristYOffset = 100;
    this.wristAimDiv.style.left = `${wristSmoothed.x}px`;
    this.wristAimDiv.style.top = `${wristSmoothed.y - wristYOffset}px`;
    this.indexAimDiv.style.left = `${indexSmoothed.x}px`;
    this.indexAimDiv.style.top = `${indexSmoothed.y}px`;

    // Update hand model with smoothing
    if (this.handModel) {
      const smoothedPosition = this.handModelPositionSmoother(this.targetHandPosition);
      this.handModel.position.copy(smoothedPosition);
      
      // Use handModelRotationSmoother for smooth rotation
      const targetRotationVector = new THREE.Vector3(
        this.targetHandRotation.x,
        this.targetHandRotation.y, 
        this.targetHandRotation.z
      );
      const smoothedRotationVector = this.handModelRotationSmoother(targetRotationVector);
      
      // Apply smoothed rotation to the hand model
      this.handModel.rotation.set(
        smoothedRotationVector.x,
        smoothedRotationVector.y,
        smoothedRotationVector.z
      );
    }

    // Update bone points with smoothing
    this.points.forEach((point) => {
      const smoothedPos = point.smoother(point.position);
      point.mesh.position.copy(smoothedPos);
    });

    // Update screen space wrist sphere with smoothing
    const smoothedScreenPos = this.wristScreenSphereSmoother(this.wristScreenPosition);
    this.wristScreenSphere.position.copy(smoothedScreenPos);
  }

  public async initialize() {
    this.wristAimDiv.className = 'aim wrist';
    this.indexAimDiv.className = 'aim';

    document.body.appendChild(this.wristAimDiv);
    document.body.appendChild(this.indexAimDiv);
    
    // Wait for model to load if not already loaded
    if (!this.handModelLoaded) {
      await this.waitForModelLoad();
    }
  }
  
  private async waitForModelLoad(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.handModelLoaded) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
  
  private async loadHandModel(): Promise<void> {
    const loader = new GLTFLoader();
    
    try {
      const gltf = await loader.loadAsync('/assets/hand.glb');
      this.handModel = gltf.scene;
      
      // Scale and position the model
      this.handModel.scale.set(0.4, 0.4, 0.4);
      
      // Apply materials and invert normals for right hand
      this.handModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Invert normals by flipping geometry on X axis
          if (child.geometry) {
            child.geometry.scale(-1, 1, 1);
          }
          
          child.material = new THREE.MeshStandardMaterial({
            color: 0xffcc99, // Skin color
            roughness: 0.7,
            metalness: 0.1,
            side: THREE.DoubleSide // Ensure visibility from all angles
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      //this.meshGroup.add(this.handModel);
      this.handModelLoaded = true;
      console.log('Hand model loaded successfully');
      
    } catch (error) {
      console.error('Failed to load hand model:', error);
      // Continue without the model - just show points
      this.showPoints = true;
    }
  }

  public update3DAim(hand: handPoseDetection.Hand) {
    if (!hand?.keypoints3D) {
      return;
    }

    const wristKeypoint = hand.keypoints3D[0];
    const scale = 10;

    hand.keypoints3D.forEach((keypoint, index: number) => {
      const pos = new THREE.Vector3(
        -keypoint.x * scale + this.wristAimPos.x * 0.001,
        -keypoint.y * scale - this.wristAimPos.y * 0.001,
        (keypoint.z ?? 0) * scale + this.wristAimPos.z * 0.001
      );

      this.points[index].position.copy(pos);
    });
    
    // Update target position and rotation for hand model
    if (this.handModelLoaded && wristKeypoint) {
      // Set target position at wrist
      this.targetHandPosition.set(
        -wristKeypoint.x * scale + this.wristAimPos.x * 0.001,
        -wristKeypoint.y * scale - this.wristAimPos.y * 0.001,
        (wristKeypoint.z ?? 0) * scale + this.wristAimPos.z * 0.001
      );
      
      // Calculate target rotation based on hand orientation
      if (hand.keypoints3D && hand.keypoints3D.length > 9) {
        const middleBase = hand.keypoints3D[9]; // Middle finger MCP
        const indexBase = hand.keypoints3D[5];  // Index finger MCP
        
        // Create hand coordinate system
        const palmDirection = new THREE.Vector3(
          -(middleBase.x - wristKeypoint.x),
          -(middleBase.y - wristKeypoint.y),
          (middleBase.z ?? 0) - (wristKeypoint.z ?? 0)
        ).normalize();
        
        const sideDirection = new THREE.Vector3(
          -(indexBase.x - wristKeypoint.x),
          -(indexBase.y - wristKeypoint.y),
          (indexBase.z ?? 0) - (wristKeypoint.z ?? 0)
        ).normalize();
        
        const upDirection = new THREE.Vector3().crossVectors(palmDirection, sideDirection).normalize();
        
        // Create rotation matrix and convert to Euler
        const matrix = new THREE.Matrix4();
        matrix.makeBasis(sideDirection, palmDirection, upDirection);
        this.targetHandRotation.setFromRotationMatrix(matrix);
        
        // Add some base rotation to align with the hand model's default pose
        this.targetHandRotation.x += Math.PI / 2;
        this.targetHandRotation.y += Math.PI;
      }
    }
  }

  public update2DAim(wristPos: THREE.Vector3, indexPos: THREE.Vector3, camera?: THREE.Camera) {
    this.wristAimPos.copy(wristPos);
    this.indexAimPos.copy(indexPos);
    
    if (camera) {
      this.currentCamera = camera;
    }
    
    if (this.currentCamera) {
      // Apply 100px upward offset to match the wristAimDiv
      const wristYOffset = 100;
      const adjustedWristY = wristPos.y - wristYOffset;
      
      // Convert screen coordinates to normalized device coordinates (-1 to 1)
      const ndcX = (wristPos.x / window.innerWidth) * 2 - 1;
      const ndcY = -(adjustedWristY / window.innerHeight) * 2 + 1;
      
      // Create a vector in NDC space
      const ndcVector = new THREE.Vector3(ndcX, ndcY, 0.5);
      
      // Unproject to world coordinates
      ndcVector.unproject(this.currentCamera);
      
      // Get camera direction
      const cameraDirection = new THREE.Vector3();
      this.currentCamera.getWorldDirection(cameraDirection);
      
      // Position the sphere at a fixed distance from camera
      const distanceFromCamera = 2;
      const cameraPosition = new THREE.Vector3();
      this.currentCamera.getWorldPosition(cameraPosition);
      
      // Calculate the ray from camera through the NDC point
      const rayDirection = ndcVector.sub(cameraPosition).normalize();
      
      // Set sphere position along this ray at fixed distance
      this.wristScreenPosition.copy(cameraPosition);
      this.wristScreenPosition.addScaledVector(rayDirection, distanceFromCamera);
    }
  }

  public togglePoints(): void {
    this.showPoints = !this.showPoints;
    this.points.forEach(point => {
      point.mesh.visible = this.showPoints;
    });
  }

  public setSmoothingFactor(position: number, rotation: number): void {
    // Allow dynamic adjustment of smoothing
    this.handModelPositionSmoother = createVector3Smoother(position);
    this.handModelRotationSmoother = createVector3Smoother(rotation);
  }
  
  public getHandDebugInfo(): string {
    // Debug function to get hand information
    return `Hand bones: ${this.points.length} points, Model loaded: ${this.handModelLoaded}, Position smoothing: 0.15, Rotation smoothing: 0.08 (using handModelRotationSmoother)`;
  }

  public dispose() {
    // Remove DOM elements
    if (this.wristAimDiv.parentNode) {
      this.wristAimDiv.parentNode.removeChild(this.wristAimDiv);
    }
    if (this.indexAimDiv.parentNode) {
      this.indexAimDiv.parentNode.removeChild(this.indexAimDiv);
    }

    // Dispose geometry and material
    this.geometry.dispose();
    this.material.dispose();
    
    // Dispose hand model
    if (this.handModel) {
      this.handModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }

    // Remove all meshes from group
    while (this.meshGroup.children.length > 0) {
      this.meshGroup.remove(this.meshGroup.children[0]);
    }

    // Remove group from parent if it has one
    if (this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
  }
}
