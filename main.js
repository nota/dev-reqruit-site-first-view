import GUI from "lil-gui";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ── Constants ──
const MESH_COUNT = 3;
const TWO_PI_THIRD = (2 * Math.PI) / 3;

// ── Renderer ──
const canvas = document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// ── Scene ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// ── Camera (Orthographic) ──
const frustumSize = 3;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
	(-frustumSize * aspect) / 2,
	(frustumSize * aspect) / 2,
	frustumSize / 2,
	-frustumSize / 2,
	0.1,
	100,
);
camera.position.set(0, 0, 15);
camera.zoom = 1.8;
camera.updateProjectionMatrix();

// ── Lighting ──
scene.add(new THREE.AmbientLight(0xffffff, 1.85));
const dirLight = new THREE.DirectionalLight(0xffffff, 4.2);
dirLight.position.set(17, 10, 0);
scene.add(dirLight);

// ── Environment map ──
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.background = new THREE.Color(0x888888);
scene.environment = pmremGenerator.fromScene(envScene).texture;

// ── Glass material ──
const glassMaterial = new THREE.MeshPhysicalMaterial({
	transmission: 0,
	roughness: 0,
	thickness: 0,
	ior: 1,
	envMapIntensity: 1.0,
	color: new THREE.Color(0x000000),
	metalness: 1,
});

const materialParams = {
	transmission: 0,
	roughness: 0,
	thickness: 0,
	ior: 1,
	metalness: 1,
	color: "#000000",
};

// ── Turntable params ──
const turntableParams = {
	radius: 0.9,
	interval: 3.0,
	transitionDuration: 2.0,
};

const bgParams = {
	color: "#ffffff",
};

// ── Diamond material ──
const diamondMaterial = new THREE.MeshPhysicalMaterial({
	transmission: 1,
	roughness: 0,
	thickness: 1.5,
	ior: 2.42,
	envMapIntensity: 1.0,
	color: new THREE.Color(0xffffff),
	metalness: 0,
	transparent: true,
});

const diamondMatParams = {
	transmission: 1,
	roughness: 0,
	thickness: 1.5,
	ior: 2.42,
	metalness: 0,
	color: "#ffffff",
	scale: 0.55,
	rotX: 0,
	rotY: 0,
	rotZ: 0,
	autoRotate: true,
	autoSpeed: 0.2,
};

let diamondMesh = null;

// ── CubeCamera for diamond reflections (added to turntable after its init) ──
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
	generateMipmaps: true,
	minFilter: THREE.LinearMipmapLinearFilter,
});
const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
diamondMaterial.envMap = cubeRenderTarget.texture;

// ── Per-mesh rotation params (degrees) ──
const meshProps = [
	{ rotX: 0, rotY: 0, rotZ: 0, scale: 0.5 },
	{ rotX: 0, rotY: 120, rotZ: 0, scale: 0.5 },
	{ rotX: 0, rotY: -32, rotZ: 90, scale: 0.5 },
];

// ── Turntable state ──
const turntable = new THREE.Group();
scene.add(turntable);
turntable.add(cubeCamera);

let currentIndex = 0;
let targetAngle = 0;
let currentAngle = 0;
let prevAngle = 0;
let lastSwitchTime = 0;
let isTransitioning = false;
const meshes = [];
const meshBaseScales = []; // normalized scale per mesh

// ── Normalize a mesh: center geometry & uniform scale ──
function normalizeMesh(mesh) {
	const geo = mesh.geometry;
	geo.computeBoundingBox();
	const box = geo.boundingBox;
	const center = box.getCenter(new THREE.Vector3());
	geo.translate(-center.x, -center.y, -center.z);

	const size = box.getSize(new THREE.Vector3());
	const maxDim = Math.max(size.x, size.y, size.z);
	if (maxDim > 0) {
		const s = 1.0 / maxDim;
		mesh.scale.setScalar(s);
	}
}

// ── Place meshes on the turntable circle ──
function arrangeMeshes() {
	const R = turntableParams.radius;
	meshes.forEach((mesh, i) => {
		const angle = i * TWO_PI_THIRD;
		mesh.position.set(Math.sin(angle) * R, 0, Math.cos(angle) * R);
	});
}

// ── Load GLB ──
const loader = new GLTFLoader();
loader.load(
	"merge2.glb",
	(gltf) => {
		const root = gltf.scene;
		// Collect direct child meshes
		root.children.forEach((child) => {
			if (child.isMesh && meshes.length < MESH_COUNT) {
				meshes.push(child);
			}
		});
		// If meshes are nested deeper, traverse
		if (meshes.length < MESH_COUNT) {
			root.traverse((child) => {
				if (
					child.isMesh &&
					!meshes.includes(child) &&
					meshes.length < MESH_COUNT
				) {
					meshes.push(child);
				}
			});
		}

		// Normalize, apply material, add to turntable
		meshes.forEach((mesh) => {
			mesh.removeFromParent();
			normalizeMesh(mesh);
			meshBaseScales.push(mesh.scale.x); // store normalized scale
			mesh.material = glassMaterial;
			turntable.add(mesh);
		});

		arrangeMeshes();

		// Build per-mesh GUI folders
		meshes.forEach((mesh, i) => {
			const folder = gui.addFolder(`Mesh ${i}`);
			const props = meshProps[i];
			const deg = THREE.MathUtils.degToRad;
			const updateRot = () => {
				mesh.rotation.set(deg(props.rotX), deg(props.rotY), deg(props.rotZ));
			};
			folder
				.add(props, "scale", 0.1, 5, 0.05)
				.name("Scale")
				.onChange((v) => {
					mesh.scale.setScalar(meshBaseScales[i] * v);
				});
			folder.add(props, "rotX", -180, 180, 1).name("X°").onChange(updateRot);
			folder.add(props, "rotY", -180, 180, 1).name("Y°").onChange(updateRot);
			folder.add(props, "rotZ", -180, 180, 1).name("Z°").onChange(updateRot);
			updateRot();
		});

		console.log(`Loaded ${meshes.length} meshes from merge2.glb`);
	},
	undefined,
	(error) => console.error("Error loading GLB:", error),
);

// ── Load diamond.glb at turntable center ──
loader.load(
	"diamond.glb",
	(gltf) => {
		const root = gltf.scene;
		// Find first mesh
		root.traverse((child) => {
			if (child.isMesh && !diamondMesh) {
				diamondMesh = child;
			}
		});
		if (diamondMesh) {
			diamondMesh.removeFromParent();
			// Center geometry
			const geo = diamondMesh.geometry;
			geo.computeBoundingBox();
			const center = geo.boundingBox.getCenter(new THREE.Vector3());
			geo.translate(-center.x, -center.y, -center.z);
			diamondMesh.material = diamondMaterial;
			diamondMesh.scale.setScalar(diamondMatParams.scale);
			scene.add(diamondMesh);
			console.log("Loaded diamond.glb");
		}
	},
	undefined,
	(error) => console.error("Error loading diamond.glb:", error),
);

// ── Controls ──
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// ── GUI ──
const gui = new GUI();

const bgFolder = gui.addFolder("Background");
bgFolder.addColor(bgParams, "color").onChange((v) => {
	scene.background.set(v);
});

const ttFolder = gui.addFolder("Turntable");
ttFolder.add(turntableParams, "interval", 1, 10, 0.1).name("Interval (s)");
ttFolder
	.add(turntableParams, "radius", 0.5, 5, 0.1)
	.name("Radius")
	.onChange(() => {
		arrangeMeshes();
	});
ttFolder
	.add(turntableParams, "transitionDuration", 0.2, 2, 0.05)
	.name("Transition (s)");

const lightParams = {
	ambIntensity: 1.85,
	dirIntensity: 4.2,
	dirX: dirLight.position.x,
	dirY: dirLight.position.y,
	dirZ: dirLight.position.z,
};
const lightFolder = gui.addFolder("Light");
lightFolder
	.add(lightParams, "ambIntensity", 0, 3, 0.05)
	.name("Ambient")
	.onChange((v) => {
		scene.children.find((c) => c.isAmbientLight).intensity = v;
	});
lightFolder
	.add(lightParams, "dirIntensity", 0, 5, 0.1)
	.name("Dir Intensity")
	.onChange((v) => {
		dirLight.intensity = v;
	});
const updateDirPos = () => {
	dirLight.position.set(lightParams.dirX, lightParams.dirY, lightParams.dirZ);
};
lightFolder
	.add(lightParams, "dirX", -20, 20, 0.5)
	.name("Dir X")
	.onChange(updateDirPos);
lightFolder
	.add(lightParams, "dirY", -20, 20, 0.5)
	.name("Dir Y")
	.onChange(updateDirPos);
lightFolder
	.add(lightParams, "dirZ", -20, 20, 0.5)
	.name("Dir Z")
	.onChange(updateDirPos);

const camParams = {
	posX: 0,
	posY: 0,
	posZ: 15,
	zoom: 0.1,
};
const camFolder = gui.addFolder("Camera");
const updateCam = () => {
	camera.position.set(camParams.posX, camParams.posY, camParams.posZ);
};
camFolder.add(camParams, "posX", -20, 20, 0.1).name("X").onChange(updateCam);
camFolder.add(camParams, "posY", -20, 20, 0.1).name("Y").onChange(updateCam);
camFolder.add(camParams, "posZ", -20, 20, 0.1).name("Z").onChange(updateCam);
camFolder
	.add(camParams, "zoom", 0.1, 5, 0.05)
	.name("Zoom")
	.onChange((v) => {
		camera.zoom = v;
		camera.updateProjectionMatrix();
	});

const matFolder = gui.addFolder("Material");
matFolder.add(materialParams, "transmission", 0, 1, 0.01).onChange((v) => {
	glassMaterial.transmission = v;
});
matFolder.add(materialParams, "roughness", 0, 1, 0.01).onChange((v) => {
	glassMaterial.roughness = v;
});
matFolder.add(materialParams, "thickness", 0, 5, 0.01).onChange((v) => {
	glassMaterial.thickness = v;
});
matFolder.add(materialParams, "ior", 1, 2.5, 0.01).onChange((v) => {
	glassMaterial.ior = v;
});
matFolder.add(materialParams, "metalness", 0, 1, 0.01).onChange((v) => {
	glassMaterial.metalness = v;
});
matFolder.addColor(materialParams, "color").onChange((v) => {
	glassMaterial.color.set(v);
});
materialParams.blending = THREE.NormalBlending;
matFolder
	.add(materialParams, "blending", {
		No: THREE.NoBlending,
		Normal: THREE.NormalBlending,
		Additive: THREE.AdditiveBlending,
		Subtractive: THREE.SubtractiveBlending,
		Multiply: THREE.MultiplyBlending,
	})
	.name("Blending")
	.onChange((v) => {
		glassMaterial.blending = Number(v);
		glassMaterial.needsUpdate = true;
	});

const diamondFolder = gui.addFolder("Diamond");
diamondFolder
	.add(diamondMatParams, "scale", 0.05, 3, 0.05)
	.name("Scale")
	.onChange((v) => {
		if (diamondMesh) diamondMesh.scale.setScalar(v);
	});
const dDeg = THREE.MathUtils.degToRad;
const updateDiamondRot = () => {
	if (diamondMesh)
		diamondMesh.rotation.set(
			dDeg(diamondMatParams.rotX),
			dDeg(diamondMatParams.rotY),
			dDeg(diamondMatParams.rotZ),
		);
};
diamondFolder
	.add(diamondMatParams, "rotX", -180, 180, 1)
	.name("Rot X°")
	.onChange(updateDiamondRot);
diamondFolder
	.add(diamondMatParams, "rotY", -180, 180, 1)
	.name("Rot Y°")
	.onChange(updateDiamondRot);
diamondFolder
	.add(diamondMatParams, "rotZ", -180, 180, 1)
	.name("Rot Z°")
	.onChange(updateDiamondRot);
diamondFolder.add(diamondMatParams, "autoRotate").name("Auto Rotate");
diamondFolder
	.add(diamondMatParams, "autoSpeed", -3, 3, 0.05)
	.name("Auto Speed");
diamondFolder
	.add(diamondMatParams, "transmission", 0, 1, 0.01)
	.onChange((v) => {
		diamondMaterial.transmission = v;
	});
diamondFolder.add(diamondMatParams, "roughness", 0, 1, 0.01).onChange((v) => {
	diamondMaterial.roughness = v;
});
diamondFolder.add(diamondMatParams, "thickness", 0, 5, 0.01).onChange((v) => {
	diamondMaterial.thickness = v;
});
diamondFolder.add(diamondMatParams, "ior", 1, 3, 0.01).onChange((v) => {
	diamondMaterial.ior = v;
});
diamondFolder.add(diamondMatParams, "metalness", 0, 1, 0.01).onChange((v) => {
	diamondMaterial.metalness = v;
});
diamondFolder.addColor(diamondMatParams, "color").onChange((v) => {
	diamondMaterial.color.set(v);
});

// ── Resize ──
window.addEventListener("resize", () => {
	const w = window.innerWidth;
	const h = window.innerHeight;
	const a = w / h;
	camera.left = (-frustumSize * a) / 2;
	camera.right = (frustumSize * a) / 2;
	camera.top = frustumSize / 2;
	camera.bottom = -frustumSize / 2;
	camera.updateProjectionMatrix();
	renderer.setSize(w, h);
});

// ── EaseInOutQuad ──
function easeInOutQuad(t) {
	return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

// ── Animation loop ──
const clock = new THREE.Clock();

function animate() {
	requestAnimationFrame(animate);
	const elapsed = clock.getElapsedTime();

	// Turntable rotation logic
	const timeSinceSwitch = elapsed - lastSwitchTime;

	if (!isTransitioning && timeSinceSwitch >= turntableParams.interval) {
		currentIndex = (currentIndex + 1) % MESH_COUNT;
		targetAngle -= TWO_PI_THIRD; // always rotate in the same direction
		prevAngle = currentAngle;
		lastSwitchTime = elapsed;
		isTransitioning = true;
	}

	if (isTransitioning) {
		const tElapsed = elapsed - lastSwitchTime;
		const t = Math.min(tElapsed / turntableParams.transitionDuration, 1);
		const eased = easeInOutQuad(t);
		currentAngle = prevAngle + (targetAngle - prevAngle) * eased;
		if (t >= 1) {
			currentAngle = targetAngle;
			isTransitioning = false;
		}
	}

	turntable.rotation.y = currentAngle;

	// ── Diamond auto rotation ──
	if (diamondMesh && diamondMatParams.autoRotate) {
		diamondMesh.rotation.y = elapsed * diamondMatParams.autoSpeed;
	}

	// ── Update CubeCamera for diamond reflections ──
	if (diamondMesh) {
		diamondMesh.visible = false;
		cubeCamera.position.copy(diamondMesh.position);
		cubeCamera.update(renderer, scene);
		diamondMesh.visible = true;
	}

	controls.update();
	renderer.render(scene, camera);
}

animate();
