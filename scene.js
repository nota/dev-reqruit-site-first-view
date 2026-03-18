import * as THREE from "three";
import { createGrainientBackground } from "./grainient.js";
import { sceneParams, cameraParams, lightParams } from "./config.js";

const BG_RESOLUTION_SCALE = 0.5;

export function createScene(canvas) {
	// ── Renderer ──
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = sceneParams.toneMappingExposure;

	// ── Scene ──
	const scene = new THREE.Scene();

	// ── Grainient background ──
	const bg = createGrainientBackground();
	const bgRenderTarget = new THREE.WebGLRenderTarget(1, 1);
	scene.background = bgRenderTarget.texture;

	// ── Camera (Orthographic) ──
	const frustumSize = sceneParams.frustumSize;
	const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
	camera.position.set(cameraParams.posX, cameraParams.posY, cameraParams.posZ);
	camera.zoom = cameraParams.zoom;

	// ── Lighting ──
	const ambientLight = new THREE.AmbientLight(0xffffff, lightParams.ambIntensity);
	scene.add(ambientLight);
	const dirLight = new THREE.DirectionalLight(0xffffff, lightParams.dirIntensity);
	dirLight.position.set(lightParams.dirX, lightParams.dirY, lightParams.dirZ);
	scene.add(dirLight);

	// ── Environment map ──
	const pmremGenerator = new THREE.PMREMGenerator(renderer);
	const envScene = new THREE.Scene();
	envScene.background = new THREE.Color(0x888888);
	scene.environment = pmremGenerator.fromScene(envScene).texture;
	pmremGenerator.dispose();

	// ── Resize helper ──
	function applySize(w, h) {
		const a = w / h;
		camera.left = (-frustumSize * a) / 2;
		camera.right = (frustumSize * a) / 2;
		camera.top = frustumSize / 2;
		camera.bottom = -frustumSize / 2;
		camera.updateProjectionMatrix();
		renderer.setSize(w, h);
		const pw = w * renderer.getPixelRatio();
		const ph = h * renderer.getPixelRatio();
		const bgW = Math.max(1, (pw * BG_RESOLUTION_SCALE) | 0);
		const bgH = Math.max(1, (ph * BG_RESOLUTION_SCALE) | 0);
		bg.uniforms.iResolution.value.set(bgW, bgH);
		bgRenderTarget.setSize(bgW, bgH);
	}

	// ── ResizeObserver (iframe-safe) ──
	const container = canvas.parentElement || document.body;
	const resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			const { width, height } = entry.contentRect;
			if (width > 0 && height > 0) {
				applySize(width, height);
			}
		}
	});
	resizeObserver.observe(container);

	// Initial size
	applySize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);

	// ── Render background each frame ──
	function renderBackground(elapsed) {
		bg.syncTime(elapsed);
		bg.syncAllUniforms();
		renderer.setRenderTarget(bgRenderTarget);
		renderer.render(bg.scene, bg.camera);
		renderer.setRenderTarget(null);
	}

	function render() {
		renderer.render(scene, camera);
	}

	function dispose() {
		resizeObserver.disconnect();
		bgRenderTarget.dispose();
		bg.uniforms.iResolution.value = null;
		renderer.dispose();
	}

	return {
		renderer,
		scene,
		camera,
		ambientLight,
		dirLight,
		bg,
		frustumSize,
		renderBackground,
		render,
		resize: applySize,
		dispose,
	};
}
