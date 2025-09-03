import * as THREE from 'three';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { createVector3Smoother } from '../utils/smoother';

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

  private wristAimSmoother = createVector3Smoother();
  private indexAimSmoother = createVector3Smoother();

  private wristAimPos: THREE.Vector3 = new THREE.Vector3();
  private indexAimPos: THREE.Vector3 = new THREE.Vector3();

  private wristAimDiv: HTMLDivElement;
  private indexAimDiv: HTMLDivElement;

  public meshGroup: THREE.Group;
  public points: {
    smoother: ReturnType<typeof createVector3Smoother>;
    mesh: THREE.Mesh;
    position: THREE.Vector3;
  }[];

  constructor() {
    this.geometry = new THREE.SphereGeometry(0.05, 16, 16);
    this.material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

    this.wristAimDiv = document.createElement('div');
    this.indexAimDiv = document.createElement('div');

    this.meshGroup = new THREE.Group();

    this.points = this.createHandPoints();
  }

  private createHandPoints() {
    return defaultHand.map((point) => {
      const smoother = createVector3Smoother();

      const mesh = new THREE.Mesh(this.geometry, this.material);

      const position = new THREE.Vector3(point.x, point.y, point.z);

      mesh.position.copy(position);

      mesh.name = point.name;

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

    this.wristAimDiv.style.left = `${wristSmoothed.x}px`;
    this.wristAimDiv.style.top = `${wristSmoothed.y}px`;
    this.indexAimDiv.style.left = `${indexSmoothed.x}px`;
    this.indexAimDiv.style.top = `${indexSmoothed.y}px`;

    this.points.forEach((point) => {
      const smoothedPos = point.smoother(point.position);
      point.mesh.position.copy(smoothedPos);
    });
  }

  public initialize() {
    this.wristAimDiv.className = 'aim wrist';
    this.indexAimDiv.className = 'aim';

    document.body.appendChild(this.wristAimDiv);
    document.body.appendChild(this.indexAimDiv);
  }

  public update3DAim(hand: handPoseDetection.Hand) {
    if (!hand?.keypoints3D) {
      return;
    }

    hand.keypoints3D.forEach((keypoint, index: number) => {
      const scale = 10;

      const pos = new THREE.Vector3(
        -keypoint.x * scale + this.wristAimPos.x * 0.001,
        -keypoint.y * scale - this.wristAimPos.y * 0.001,
        (keypoint.z ?? 0) * scale + this.wristAimPos.z * 0.001
      );

      this.points[index].position.copy(pos);
    });
  }

  public update2DAim(wristPos: THREE.Vector3, indexPos: THREE.Vector3) {
    this.wristAimPos.copy(wristPos);
    this.indexAimPos.copy(indexPos);
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
