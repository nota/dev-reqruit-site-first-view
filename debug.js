import * as THREE from "three";
import { grainientParams } from "./grainient.js";
import { lightParams, cameraParams } from "./config.js";

export function isDebugMode() {
	return new URLSearchParams(window.location.search).has("debug");
}

export async function createDebugUI({ scene: sceneCtx, diamond }) {
	const [{ default: GUI }, { default: Stats }] = await Promise.all([
		import("lil-gui"),
		import("three/addons/libs/stats.module.js"),
	]);

	const gui = new GUI();

	// ── Stats ──
	const stats = new Stats();
	document.body.appendChild(stats.dom);

	// ── Grainient ──
	const grainFolder = gui.addFolder("Grainient");
	grainFolder.add(grainientParams, "timeSpeed", 0, 2, 0.01);
	grainFolder.add(grainientParams, "colorBalance", -1, 1, 0.01);
	grainFolder.add(grainientParams, "warpStrength", 0.01, 5, 0.01);
	grainFolder.add(grainientParams, "warpFrequency", 0, 20, 0.1);
	grainFolder.add(grainientParams, "warpSpeed", 0, 10, 0.1);
	grainFolder.add(grainientParams, "warpAmplitude", 1, 200, 1);
	grainFolder.add(grainientParams, "blendAngle", -180, 180, 1);
	grainFolder.add(grainientParams, "blendSoftness", 0, 1, 0.01);
	grainFolder.add(grainientParams, "rotationAmount", 0, 1000, 1);
	grainFolder.add(grainientParams, "noiseScale", 0.1, 10, 0.1);
	grainFolder.add(grainientParams, "grainAmount", 0, 1, 0.01);
	grainFolder.add(grainientParams, "grainScale", 0.1, 10, 0.1);
	grainFolder.add(grainientParams, "grainAnimated");
	grainFolder.add(grainientParams, "contrast", 0.1, 3, 0.01);
	grainFolder.add(grainientParams, "gamma", 0.1, 3, 0.01);
	grainFolder.add(grainientParams, "saturation", 0, 3, 0.01);
	grainFolder.add(grainientParams, "centerX", -1, 1, 0.01);
	grainFolder.add(grainientParams, "centerY", -1, 1, 0.01);
	grainFolder.add(grainientParams, "zoom", 0.1, 3, 0.01);
	grainFolder.addColor(grainientParams, "color1");
	grainFolder.addColor(grainientParams, "color2");
	grainFolder.addColor(grainientParams, "color3");

	// ── Light ──
	const lightFolder = gui.addFolder("Light");
	lightFolder
		.add(lightParams, "ambIntensity", 0, 3, 0.05)
		.name("Ambient")
		.onChange((v) => {
			sceneCtx.ambientLight.intensity = v;
		});
	lightFolder
		.add(lightParams, "dirIntensity", 0, 5, 0.1)
		.name("Dir Intensity")
		.onChange((v) => {
			sceneCtx.dirLight.intensity = v;
		});
	const updateDirPos = () => {
		sceneCtx.dirLight.position.set(lightParams.dirX, lightParams.dirY, lightParams.dirZ);
	};
	lightFolder.add(lightParams, "dirX", -20, 20, 0.5).name("Dir X").onChange(updateDirPos);
	lightFolder.add(lightParams, "dirY", -20, 20, 0.5).name("Dir Y").onChange(updateDirPos);
	lightFolder.add(lightParams, "dirZ", -20, 20, 0.5).name("Dir Z").onChange(updateDirPos);

	// ── Camera ──
	const camFolder = gui.addFolder("Camera");
	const updateCam = () => {
		sceneCtx.camera.position.set(cameraParams.posX, cameraParams.posY, cameraParams.posZ);
	};
	camFolder.add(cameraParams, "posX", -20, 20, 0.1).name("X").onChange(updateCam);
	camFolder.add(cameraParams, "posY", -20, 20, 0.1).name("Y").onChange(updateCam);
	camFolder.add(cameraParams, "posZ", -20, 20, 0.1).name("Z").onChange(updateCam);
	camFolder
		.add(cameraParams, "zoom", 0.1, 5, 0.05)
		.name("Zoom")
		.onChange((v) => {
			sceneCtx.camera.zoom = v;
			sceneCtx.camera.updateProjectionMatrix();
		});

	// ── Diamond ──
	const dp = diamond.params;
	const diamondFolder = gui.addFolder("Diamond");
	diamondFolder
		.add(dp, "scale", 0.05, 3, 0.05)
		.name("Scale")
		.onChange((v) => {
			diamond.loadPromise.then((mesh) => {
				if (mesh) mesh.scale.setScalar(v);
			});
		});
	const updateDiamondRot = () => {
		diamond.loadPromise.then((mesh) => {
			if (mesh && !dp.autoRotate) {
				mesh.rotation.set(
					THREE.MathUtils.degToRad(dp.rotX),
					THREE.MathUtils.degToRad(dp.rotY),
					THREE.MathUtils.degToRad(dp.rotZ),
				);
			}
		});
	};
	const rotXCtrl = diamondFolder.add(dp, "rotX", -180, 180, 1).name("Rot X°").onChange(updateDiamondRot);
	const rotYCtrl = diamondFolder.add(dp, "rotY", -180, 180, 1).name("Rot Y°").onChange(updateDiamondRot);
	const rotZCtrl = diamondFolder.add(dp, "rotZ", -180, 180, 1).name("Rot Z°").onChange(updateDiamondRot);

	// Disable rot controls when autoRotate is on
	function syncRotControls() {
		const disabled = dp.autoRotate;
		rotXCtrl.enable(!disabled);
		rotYCtrl.enable(!disabled);
		rotZCtrl.enable(!disabled);
	}
	diamondFolder.add(dp, "autoRotate").name("Auto Rotate").onChange(syncRotControls);
	syncRotControls();

	diamondFolder.add(dp, "autoSpeed", -3, 3, 0.05).name("Auto Speed");
	diamondFolder.add(dp, "mouseInfluence", 0, 1, 0.01).name("Mouse Influence");
	diamondFolder.add(dp, "transmission", 0, 1, 0.01).onChange((v) => {
		diamond.material.transmission = v;
	});
	diamondFolder.add(dp, "roughness", 0, 1, 0.01).onChange((v) => {
		diamond.material.roughness = v;
	});
	diamondFolder.add(dp, "thickness", 0, 5, 0.01).onChange((v) => {
		diamond.material.thickness = v;
	});
	diamondFolder.add(dp, "ior", 1, 3, 0.01).onChange((v) => {
		diamond.material.ior = v;
	});
	diamondFolder.add(dp, "metalness", 0, 1, 0.01).onChange((v) => {
		diamond.material.metalness = v;
	});
	diamondFolder.addColor(dp, "color").onChange((v) => {
		diamond.material.color.set(v);
	});

	function update() {
		stats.update();
	}

	function dispose() {
		gui.destroy();
		stats.dom.remove();
	}

	return { update, dispose };
}
