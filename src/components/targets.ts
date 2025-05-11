import * as THREE from 'three';
export class Target {
  public mesh: THREE.Mesh;

  constructor(position: THREE.Vector3, color: number = 0x00ff00) {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({ color });
    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.position.copy(position);
    this.mesh.castShadow = this.mesh.receiveShadow = true;

    this.mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
  }
}

const getStaticCubePositions = (): THREE.Vector3[] => {
  return [
    { x: -2, y: 2, z: 0 },
    { x: 2, y: 1, z: -1 },
    { x: 0, y: -1, z: 2 },
    { x: 1, y: 2, z: -2 },
    { x: -3, y: 0, z: -10 },
    { x: 3, y: 1, z: -20 },
    { x: 0, y: 0, z: -30 },
    { x: 2, y: 2, z: -40 },
    { x: -2, y: 1, z: -50 },
    { x: 4, y: -1, z: -60 },
    { x: -1, y: 3, z: -70 },
    { x: 1, y: 0, z: -80 },
    { x: -1, y: 3, z: -90 },
  ].map((pos) => new THREE.Vector3(pos.x, pos.y, pos.z));
};

const getRandomCubePositions = (count: number): THREE.Vector3[] => {
  return Array.from(
    { length: count },
    () =>
      new THREE.Vector3(
        THREE.MathUtils.randFloat(-9.5, 9.5),
        THREE.MathUtils.randFloat(-0.5, 9.5),
        THREE.MathUtils.randFloat(-99.5, -0.5)
      )
  );
};

export const initializeTargets = (
  staticCount: number = 13,
  randomCount: number = 100
): Target[] => {
  const staticPositions = getStaticCubePositions().slice(0, staticCount);
  const randomPositions = getRandomCubePositions(randomCount);
  const allPositions = [...staticPositions, ...randomPositions];

  return allPositions.map((position) => new Target(position));
};
