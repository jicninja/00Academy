import * as THREE from 'three';

export const targets: THREE.Mesh[] = [];

const cubeGeo = new THREE.BoxGeometry();
const cubeMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

const getStaticCubePositions = () => {
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

const getRandomCubePositions = (count: number) => {
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

export const createTargets = (positions: THREE.Vector3[]) => {
  return positions.map((pos) => {
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.copy(pos);
    cube.castShadow = cube.receiveShadow = true;
    cube.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    return cube;
  });
};

export const initializeTargets = () => {
  const positions = [
    ...getStaticCubePositions(),
    ...getRandomCubePositions(100),
  ];
  // const positions = getRandomCubePositions(count);
  const newTargets = createTargets(positions);
  targets.push(...newTargets);
};
