import * as THREE from 'three';

class Wall {
  private static wallGeo = new THREE.PlaneGeometry(100, 100);

  public mesh: THREE.Mesh;

  constructor(rotation: THREE.Euler, position: THREE.Vector3) {
    const texture = new THREE.TextureLoader().load('./assets/grid.jpg');
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      emissiveMap: texture,
      emissive: new THREE.Color(0x00ff00),
      emissiveIntensity: 0.1,
    });

    this.mesh = new THREE.Mesh(Wall.wallGeo, material);
    this.mesh.rotation.copy(rotation);
    this.mesh.position.copy(position);
    this.mesh.receiveShadow = true;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }
}

export const initializeWalls = () => {
  const wallConfigs = [
    { rotation: [-Math.PI / 2, 0, 0], position: [0, -2, 0] }, // Floor
    { rotation: [Math.PI / 2, 0, 0], position: [0, 10, 0] }, // Ceiling
    { rotation: [0, Math.PI / 2, 0], position: [-10, 4, 0] }, // Left
    { rotation: [0, -Math.PI / 2, 0], position: [10, 4, 0] }, // Right
    { rotation: [0, 0, 0], position: [0, 4, -100] }, // Back
  ];

  const walls = wallConfigs.map(
    (config) =>
      new Wall(
        new THREE.Euler(...config.rotation),
        new THREE.Vector3(...config.position)
      )
  );

  return walls;
};
