import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import GUI from 'lil-gui';
import { createGrainientBackground, grainientParams } from './grainient.js';

// Renderer
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Main scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 4);

// Background – render Grainient to a texture so it works as scene.background
// (required for MeshPhysicalMaterial transmission to see the background)
const bg = createGrainientBackground();
const bgRenderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth * renderer.getPixelRatio(),
  window.innerHeight * renderer.getPixelRatio()
);
scene.background = bgRenderTarget.texture;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// Environment map for reflections/refractions
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.background = new THREE.Color(0x888888);
const envMap = pmremGenerator.fromScene(envScene).texture;
scene.environment = envMap;

// Glass material
const glassMaterial = new THREE.MeshPhysicalMaterial({
  transmission: 1.0,
  roughness: 0.05,
  thickness: 0.5,
  ior: 1.5,
  envMapIntensity: 1.0,
  color: new THREE.Color(0xffffff),
  transparent: true,
});

const materialParams = {
  transmission: 1.0,
  roughness: 0.05,
  thickness: 0.5,
  ior: 1.5,
  color: '#ffffff',
  blending: 0,
};

// Load GLB
let modelGroup = null;
const loader = new GLTFLoader();
loader.load(
  'merge.glb',
  (gltf) => {
    modelGroup = gltf.scene;
    modelGroup.traverse((child) => {
      if (child.isMesh) {
        child.material = glassMaterial;
      }
    });

    // Center model
    const box = new THREE.Box3().setFromObject(modelGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    modelGroup.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 2.0 / maxDim;
      modelGroup.scale.setScalar(scale);
    }

    scene.add(modelGroup);
  },
  undefined,
  (error) => console.error('Error loading GLB:', error)
);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// Stats
const stats = new Stats();
document.body.appendChild(stats.dom);

// GUI
const gui = new GUI();

const grainFolder = gui.addFolder('Grainient');
grainFolder.add(grainientParams, 'timeSpeed', 0, 2, 0.01);
grainFolder.add(grainientParams, 'colorBalance', -1, 1, 0.01);
grainFolder.add(grainientParams, 'warpStrength', 0.01, 5, 0.01);
grainFolder.add(grainientParams, 'warpFrequency', 0, 20, 0.1);
grainFolder.add(grainientParams, 'warpSpeed', 0, 10, 0.1);
grainFolder.add(grainientParams, 'warpAmplitude', 1, 200, 1);
grainFolder.add(grainientParams, 'blendAngle', -180, 180, 1);
grainFolder.add(grainientParams, 'blendSoftness', 0, 1, 0.01);
grainFolder.add(grainientParams, 'rotationAmount', 0, 1000, 1);
grainFolder.add(grainientParams, 'noiseScale', 0.1, 10, 0.1);
grainFolder.add(grainientParams, 'grainAmount', 0, 1, 0.01);
grainFolder.add(grainientParams, 'grainScale', 0.1, 10, 0.1);
grainFolder.add(grainientParams, 'grainAnimated');
grainFolder.add(grainientParams, 'contrast', 0.1, 3, 0.01);
grainFolder.add(grainientParams, 'gamma', 0.1, 3, 0.01);
grainFolder.add(grainientParams, 'saturation', 0, 3, 0.01);
grainFolder.add(grainientParams, 'centerX', -1, 1, 0.01);
grainFolder.add(grainientParams, 'centerY', -1, 1, 0.01);
grainFolder.add(grainientParams, 'zoom', 0.1, 3, 0.01);
grainFolder.addColor(grainientParams, 'color1');
grainFolder.addColor(grainientParams, 'color2');
grainFolder.addColor(grainientParams, 'color3');

const matFolder = gui.addFolder('Material');
matFolder.add(materialParams, 'transmission', 0, 1, 0.01).onChange((v) => { glassMaterial.transmission = v; });
matFolder.add(materialParams, 'roughness', 0, 1, 0.01).onChange((v) => { glassMaterial.roughness = v; });
matFolder.add(materialParams, 'thickness', 0, 5, 0.01).onChange((v) => { glassMaterial.thickness = v; });
matFolder.add(materialParams, 'ior', 1, 2.5, 0.01).onChange((v) => { glassMaterial.ior = v; });
matFolder.addColor(materialParams, 'color').onChange((v) => { glassMaterial.color.set(v); });
matFolder.add(materialParams, 'blending', { None: 0, Normal: 1, Additive: 2, Subtractive: 3, Multiply: 4 }).onChange((v) => {
  glassMaterial.blending = Number(v);
  glassMaterial.needsUpdate = true;
});

// Resize
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  const pw = w * renderer.getPixelRatio();
  const ph = h * renderer.getPixelRatio();
  bg.uniforms.iResolution.value.set(pw, ph);
  bgRenderTarget.setSize(pw, ph);
});

// Set initial resolution
bg.uniforms.iResolution.value.set(
  window.innerWidth * renderer.getPixelRatio(),
  window.innerHeight * renderer.getPixelRatio()
);

// Animation loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // Update background uniforms
  bg.uniforms.iTime.value = elapsed;
  bg.syncUniforms();

  // Rotate model
  if (modelGroup) {
    modelGroup.rotation.y = elapsed * 0.3;
  }

  controls.update();

  // Render Grainient background to texture
  renderer.setRenderTarget(bgRenderTarget);
  renderer.render(bg.scene, bg.camera);
  renderer.setRenderTarget(null);

  // Draw main scene (background comes from scene.background = bgRenderTarget.texture)
  renderer.render(scene, camera);

  stats.update();
}

animate();
