// ── Default parameters for all modules ──

export const sceneParams = {
	frustumSize: 3,
	toneMapping: "ACESFilmic",
	toneMappingExposure: 1.0,
};

export const cameraParams = {
	posX: 0,
	posY: 0,
	posZ: 15,
	zoom: 1.8,
};

export const lightParams = {
	ambIntensity: 1.85,
	dirIntensity: 4.2,
	dirX: 17,
	dirY: 10,
	dirZ: 0,
};

export const diamondParams = {
	transmission: 1,
	roughness: 0,
	thickness: 1.5,
	ior: 2.42,
	metalness: 0,
	color: "#ffffff",
	scale: 1.1,
	rotX: 0,
	rotY: 0,
	rotZ: 0,
	autoRotate: true,
	autoSpeed: 0.2,
	mouseInfluence: 0.3,
};

export const enableDynamicReflection = false;
