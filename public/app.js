import * as THREE from 'three';

// Import Three.js

// Create the scene
const scene = new THREE.Scene();

// Create a camera
const camera = new THREE.PerspectiveCamera(
  75, // Field of view
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1, // Near clipping plane
  1000 // Far clipping plane
);
camera.position.z = 5;

// Create a renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add cubes to the scene
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

const cubes = [];
const positions = [
  { x: -2, y: 0, z: 0 },
  { x: 2, y: 1, z: -1 },
  { x: 0, y: -1, z: 2 },
  { x: 1, y: 2, z: -2 },
];

positions.forEach((pos) => {
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(pos.x, pos.y, pos.z);
  scene.add(cube);
  cubes.push(cube);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Rotate cubes
  cubes.forEach((cube) => {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
  });

  renderer.render(scene, camera);
}

animate();
