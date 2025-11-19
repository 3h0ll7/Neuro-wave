import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend, ReactThreeFiber } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { WaveConfig } from '../types';

// --- Custom Shader Material ---
// We use a custom shader to handle the vertex displacement (waves) efficiently on the GPU.

const vertexShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uElevation;
  uniform vec2 uFrequency;
  
  varying vec2 vUv;
  varying float vElevation;

  // Classic Perlin 3D Noise (simplified for GLSL)
  // Source: https://github.com/stegu/webgl-noise/blob/master/src/classicnoise3D.glsl
  vec3 mod289(vec3 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
  vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  
  float cnoise(vec3 P){
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.y, Pi0.y, Pi1.y, Pi1.y);
    vec4 iz0 = Pi0.z + vec4(0.0, 0.0, 0.0, 0.0);
    vec4 iz1 = Pi1.z + vec4(0.0, 0.0, 0.0, 0.0);
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n010 = dot(g010, vec3(Pf0.x, Pf0.y, Pf1.z));
    float n110 = dot(g110, vec3(Pf0.x, Pf1.y, Pf1.z));
    float n001 = dot(g001, vec3(Pf1.x, Pf0.y, Pf0.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf1.y, Pf0.z));
    float n011 = dot(g011, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n111 = dot(g111, Pf1);
    vec3 fade_xyz = Pf0 * Pf0 * Pf0 * (Pf0 * (Pf0 * 6.0 - 15.0) + 10.0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  void main() {
    vUv = uv;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    
    float noiseFreq = 0.5;
    float elevation = sin(modelPosition.x * uFrequency.x - uTime * uSpeed) * sin(modelPosition.z * uFrequency.y - uTime * uSpeed) * 0.2;
    
    elevation += cnoise(vec3(modelPosition.xz * uFrequency * 0.5, uTime * uSpeed * 0.5)) * uElevation;
    
    modelPosition.y += elevation;
    vElevation = elevation;
    
    gl_Position = projectionMatrix * viewMatrix * modelPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uMetalness;
  uniform float uRoughness;
  
  varying float vElevation;
  varying vec2 vUv;

  void main() {
    // Simple lighting hack based on elevation for depth
    float depth = smoothstep(-1.0, 1.0, vElevation);
    vec3 color = mix(uColor * 0.5, uColor * 1.5, depth);
    
    // Add a "grid" line effect overlay
    float gridX = smoothstep(0.98, 1.0, abs(sin(vUv.x * 100.0)));
    float gridY = smoothstep(0.98, 1.0, abs(sin(vUv.y * 100.0)));
    float grid = max(gridX, gridY) * 0.3;
    
    gl_FragColor = vec4(color + grid, 1.0);
    
    // Basic tonal mapping
    #include <colorspace_fragment>
  }
`;

// Extend Three.js with our custom material if we were using shaderMaterial directly, 
// but for Physical appearance + movement, we will use a MeshPhysicalMaterial but update geometry in Vertex Shader via onBeforeCompile 
// OR simpler: Use the custom shader above for a stylized "digital wireframe/solid" look.
// Let's stick to the custom ShaderMaterial for full control over the motion logic.

const WaveMaterial = React.forwardRef<THREE.ShaderMaterial, any>((props, ref) => {
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: 0 },
    uElevation: { value: 0 },
    uFrequency: { value: new THREE.Vector2(0, 0) },
    uColor: { value: new THREE.Color() },
    uMetalness: { value: 0.5 },
    uRoughness: { value: 0.5 },
  }), []);

  return (
    <shaderMaterial
      ref={ref}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
      wireframe={false}
      side={THREE.DoubleSide}
      transparent={true}
    />
  );
});

interface WaveMeshProps {
  config: WaveConfig;
}

const WaveMesh: React.FC<WaveMeshProps> = ({ config }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Use refs to store current values for smooth interpolation (LERP)
  const currentConfig = useRef<WaveConfig>({ ...config });

  useFrame((state, delta) => {
    if (materialRef.current) {
      // Update time
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

      // Smoothly interpolate current values towards target config
      const lerpFactor = 2.0 * delta; // Adjust speed of transition
      
      currentConfig.current.speed = THREE.MathUtils.lerp(currentConfig.current.speed, config.speed, lerpFactor);
      currentConfig.current.elevation = THREE.MathUtils.lerp(currentConfig.current.elevation, config.elevation, lerpFactor);
      currentConfig.current.roughness = THREE.MathUtils.lerp(currentConfig.current.roughness, config.roughness, lerpFactor);
      currentConfig.current.frequency.x = THREE.MathUtils.lerp(currentConfig.current.frequency.x, config.frequency.x, lerpFactor);
      currentConfig.current.frequency.y = THREE.MathUtils.lerp(currentConfig.current.frequency.y, config.frequency.y, lerpFactor);
      
      // Color interpolation
      const currentColor = new THREE.Color(materialRef.current.uniforms.uColor.value);
      const targetColor = new THREE.Color(config.color);
      currentColor.lerp(targetColor, lerpFactor);

      // Apply to uniforms
      materialRef.current.uniforms.uSpeed.value = currentConfig.current.speed;
      materialRef.current.uniforms.uElevation.value = currentConfig.current.elevation;
      materialRef.current.uniforms.uFrequency.value.set(currentConfig.current.frequency.x, currentConfig.current.frequency.y);
      materialRef.current.uniforms.uColor.value = currentColor;
      materialRef.current.uniforms.uRoughness.value = currentConfig.current.roughness;
      materialRef.current.uniforms.uMetalness.value = config.metalness; // Metalness can be instant
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[10, 10, 256, 256]} />
      <WaveMaterial ref={materialRef} />
    </mesh>
  );
};

interface WaveSceneProps {
  config: WaveConfig;
}

const WaveScene: React.FC<WaveSceneProps> = ({ config }) => {
  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 4, 6]} fov={45} />
      <OrbitControls 
        enableZoom={false} 
        maxPolarAngle={Math.PI / 2 - 0.1} 
        autoRotate={true} 
        autoRotateSpeed={0.5} 
      />
      
      <color attach="background" args={['#050505']} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Ambient and Spot lights to give some dimension if we used StandardMaterial, 
          but our shader handles most color. Keeping them for potential expansions. */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      <WaveMesh config={config} />
      
      {/* Post processing effects like Bloom could go here, 
          but kept minimal for performance and code size limits */}
    </Canvas>
  );
};

export default WaveScene;
