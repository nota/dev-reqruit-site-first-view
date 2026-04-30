import * as THREE from "three";
import { createScene } from "./scene.js";
import { createDiamond } from "./diamond.js";
import { isDebugMode, createDebugUI } from "./debug.js";

// ── Bootstrap ──
const canvas = document.getElementById("canvas");
const sceneCtx = createScene(canvas);
const diamond = createDiamond(sceneCtx.scene, sceneCtx.renderer);

// ── Debug UI (only with ?debug=1) ──
let debug = null;
if (isDebugMode()) {
	createDebugUI({ scene: sceneCtx, diamond }).then((d) => {
		debug = d;
	});
}

// ── Visibility change: pause/resume when hidden (iframe-safe) ──
const clock = new THREE.Clock();
let animationId = null;

document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		clock.stop();
		if (animationId != null) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
	} else {
		clock.start();
		if (animationId == null) {
			animate();
		}
	}
});

// ── Animation loop ──
let bgFrame = 0;
function animate() {
	animationId = requestAnimationFrame(animate);
	const elapsed = clock.getElapsedTime();

	diamond.update(elapsed);
	if (bgFrame++ % 2 === 0) sceneCtx.renderBackground(elapsed);
	sceneCtx.render();

	if (debug) debug.update();
}

animate();

// ── Dispose (for iframe re-mount) ──
export function dispose() {
	if (animationId != null) {
		cancelAnimationFrame(animationId);
		animationId = null;
	}
	diamond.dispose();
	if (debug) debug.dispose();
	sceneCtx.dispose();
}
