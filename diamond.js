import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { diamondParams, enableDynamicReflection } from "./config.js";

export function createDiamond(scene, renderer) {
	const params = { ...diamondParams };

	// ── Material ──
	const material = new THREE.MeshPhysicalMaterial({
		transmission: params.transmission,
		roughness: params.roughness,
		thickness: params.thickness,
		ior: params.ior,
		envMapIntensity: 1.0,
		color: new THREE.Color(params.color),
		metalness: params.metalness,
		transparent: true,
	});

	// ── CubeCamera (dynamic reflection, off by default) ──
	let cubeCamera = null;
	let cubeRenderTarget = null;
	if (enableDynamicReflection) {
		cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
			generateMipmaps: true,
			minFilter: THREE.LinearMipmapLinearFilter,
		});
		cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
		material.envMap = cubeRenderTarget.texture;
		scene.add(cubeCamera);
	}

	// ── Mouse tracking ──
	const mouse = { x: 0, y: 0 };
	const canvas = renderer.domElement;

	// Direct pointer events (works when canvas receives events directly)
	function onPointerMove(e) {
		mouse.x = (e.offsetX / canvas.clientWidth) * 2 - 1;
		mouse.y = -(e.offsetY / canvas.clientHeight) * 2 + 1;
	}
	canvas.addEventListener("pointermove", onPointerMove);

	// postMessage relay (for iframe with parent overlay blocking pointer events)
	function onMessage(e) {
		const d = e.data;
		if (!d || d.type !== "mousemove") return;
		mouse.x = (d.relativeX / canvas.clientWidth) * 2 - 1;
		mouse.y = -(d.relativeY / canvas.clientHeight) * 2 + 1;
	}
	window.addEventListener("message", onMessage);

	// ── Load diamond.glb ──
	let mesh = null;
	const loader = new GLTFLoader();
	const loadPromise = new Promise((resolve, reject) => {
		loader.load(
			"diamond.glb",
			(gltf) => {
				gltf.scene.traverse((child) => {
					if (child.isMesh && !mesh) {
						mesh = child;
					}
				});
				if (mesh) {
					mesh.removeFromParent();
					const geo = mesh.geometry;
					geo.computeBoundingBox();
					const center = geo.boundingBox.getCenter(new THREE.Vector3());
					geo.translate(-center.x, -center.y, -center.z);
					mesh.material = material;
					mesh.scale.setScalar(params.scale);
					scene.add(mesh);
				}
				resolve(mesh);
			},
			undefined,
			(error) => {
				console.error("Error loading diamond.glb:", error);
				reject(error);
			},
		);
	});

	function update(elapsed) {
		if (!mesh) return;

		// Auto-rotate + mouse influence
		const baseY = params.autoRotate
			? elapsed * params.autoSpeed
			: THREE.MathUtils.degToRad(params.rotY);
		mesh.rotation.x = mouse.y * params.mouseInfluence;
		mesh.rotation.y = baseY + mouse.x * params.mouseInfluence;

		// Dynamic reflection update
		if (enableDynamicReflection && cubeCamera) {
			mesh.visible = false;
			cubeCamera.position.copy(mesh.position);
			cubeCamera.update(renderer, scene);
			mesh.visible = true;
		}
	}

	function dispose() {
		canvas.removeEventListener("pointermove", onPointerMove);
		window.removeEventListener("message", onMessage);
		if (mesh) {
			mesh.geometry.dispose();
			material.dispose();
			scene.remove(mesh);
		}
		if (cubeRenderTarget) cubeRenderTarget.dispose();
		if (cubeCamera) scene.remove(cubeCamera);
	}

	return { params, material, mouse, update, dispose, loadPromise };
}
