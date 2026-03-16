import * as THREE from 'three';

const vertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}

void main(){
  float t=iTime*uTimeSpeed;
  vec2 uv=gl_FragCoord.xy/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;

  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);

  gl_FragColor=vec4(col,1.0);
}
`;

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return new THREE.Color(1, 1, 1);
  return new THREE.Color(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  );
}

export const grainientParams = {
  timeSpeed: 0.25,
  colorBalance: 0.0,
  warpStrength: 1.0,
  warpFrequency: 5.0,
  warpSpeed: 2.0,
  warpAmplitude: 50.0,
  blendAngle: 0.0,
  blendSoftness: 0.05,
  rotationAmount: 500.0,
  noiseScale: 2.0,
  grainAmount: 0.1,
  grainScale: 2.0,
  grainAnimated: false,
  contrast: 1.5,
  gamma: 1.0,
  saturation: 1.0,
  centerX: 0.0,
  centerY: 0.0,
  zoom: 0.9,
  color1: '#FF9FFC',
  color2: '#5227FF',
  color3: '#B19EEF',
};

export function createGrainientBackground() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(1, 1) },
    uTimeSpeed: { value: grainientParams.timeSpeed },
    uColorBalance: { value: grainientParams.colorBalance },
    uWarpStrength: { value: grainientParams.warpStrength },
    uWarpFrequency: { value: grainientParams.warpFrequency },
    uWarpSpeed: { value: grainientParams.warpSpeed },
    uWarpAmplitude: { value: grainientParams.warpAmplitude },
    uBlendAngle: { value: grainientParams.blendAngle },
    uBlendSoftness: { value: grainientParams.blendSoftness },
    uRotationAmount: { value: grainientParams.rotationAmount },
    uNoiseScale: { value: grainientParams.noiseScale },
    uGrainAmount: { value: grainientParams.grainAmount },
    uGrainScale: { value: grainientParams.grainScale },
    uGrainAnimated: { value: grainientParams.grainAnimated ? 1.0 : 0.0 },
    uContrast: { value: grainientParams.contrast },
    uGamma: { value: grainientParams.gamma },
    uSaturation: { value: grainientParams.saturation },
    uCenterOffset: { value: new THREE.Vector2(grainientParams.centerX, grainientParams.centerY) },
    uZoom: { value: grainientParams.zoom },
    uColor1: { value: hexToRgb(grainientParams.color1) },
    uColor2: { value: hexToRgb(grainientParams.color2) },
    uColor3: { value: hexToRgb(grainientParams.color3) },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  function syncUniforms() {
    uniforms.uTimeSpeed.value = grainientParams.timeSpeed;
    uniforms.uColorBalance.value = grainientParams.colorBalance;
    uniforms.uWarpStrength.value = grainientParams.warpStrength;
    uniforms.uWarpFrequency.value = grainientParams.warpFrequency;
    uniforms.uWarpSpeed.value = grainientParams.warpSpeed;
    uniforms.uWarpAmplitude.value = grainientParams.warpAmplitude;
    uniforms.uBlendAngle.value = grainientParams.blendAngle;
    uniforms.uBlendSoftness.value = grainientParams.blendSoftness;
    uniforms.uRotationAmount.value = grainientParams.rotationAmount;
    uniforms.uNoiseScale.value = grainientParams.noiseScale;
    uniforms.uGrainAmount.value = grainientParams.grainAmount;
    uniforms.uGrainScale.value = grainientParams.grainScale;
    uniforms.uGrainAnimated.value = grainientParams.grainAnimated ? 1.0 : 0.0;
    uniforms.uContrast.value = grainientParams.contrast;
    uniforms.uGamma.value = grainientParams.gamma;
    uniforms.uSaturation.value = grainientParams.saturation;
    uniforms.uCenterOffset.value.set(grainientParams.centerX, grainientParams.centerY);
    uniforms.uZoom.value = grainientParams.zoom;
    uniforms.uColor1.value.copy(hexToRgb(grainientParams.color1));
    uniforms.uColor2.value.copy(hexToRgb(grainientParams.color2));
    uniforms.uColor3.value.copy(hexToRgb(grainientParams.color3));
  }

  return { scene, camera, uniforms, syncUniforms };
}
