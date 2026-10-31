/**
 * Vein-to-Road Morphing GLSL Shader for "Veins of Life".
 * Interpolates smoothly between biological vascular green tubes and engineered urban roads.
 */

export const MorphVeinVertexShader = `
  attribute vec3 aUrbanPos;
  attribute float aBranchWeight;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vMorphFactor;

  uniform float uTime;
  uniform float uMorph; // 0.0 = biological leaf vein, 1.0 = Delhi road network
  uniform float uOpacity;

  void main() {
    vUv = uv;
    vMorphFactor = uMorph;

    // Vertex position interpolation between organic vein coordinate and urban road coordinate
    vec3 organicPos = position;
    vec3 urbanPos = aUrbanPos;

    // Smooth organic-to-road blend with slight curve straightening
    float tMorph = smoothstep(0.0, 1.0, uMorph);
    vec3 blendedPos = mix(organicPos, urbanPos, tMorph);

    // Subtle biological pulse while in organic state
    if (uMorph < 0.6) {
      float pulse = sin(uTime * 3.0 - position.z * 1.5) * 0.04 * (1.0 - uMorph);
      blendedPos += normal * pulse;
    }

    vec4 worldPos = modelMatrix * vec4(blendedPos, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const MorphVeinFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vMorphFactor;

  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uSunPosition;
  uniform vec3 uCorridorColor;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uSunPosition - vWorldPosition);
    vec3 V = normalize(-vWorldPosition);

    // 1. Biological Vein State (Emerald green with glowing inner xylem/phloem sap)
    vec3 organicColor = vec3(0.2, 0.82, 0.32);
    float sapPulse = sin(vUv.x * 20.0 - uTime * 4.0) * 0.5 + 0.5;
    vec3 sapGlow = vec3(0.65, 1.0, 0.45) * sapPulse * 0.45;
    vec3 bioVein = organicColor + sapGlow;

    // 2. Urban Road State (Ref 2: Light crisp road lines on warm terracotta)
    vec3 roadColor = vec3(0.98, 0.94, 0.86); // Light road line
    // Centerline marking
    float dash = step(0.5, fract(vUv.x * 40.0));
    float centerLine = smoothstep(0.08, 0.0, abs(vUv.y - 0.5)) * dash;
    vec3 urbanRoad = mix(uCorridorColor, roadColor, 0.7) + vec3(centerLine * 0.5);

    // 3. Gradual Color Morph: Deep green -> Emerald -> Olive -> Ochre -> Terracotta/Road
    float m = clamp(vMorphFactor, 0.0, 1.0);
    vec3 morphed;
    if (m < 0.33) {
      morphed = mix(bioVein, vec3(0.55, 0.78, 0.25), m * 3.0);
    } else if (m < 0.66) {
      morphed = mix(vec3(0.55, 0.78, 0.25), vec3(0.85, 0.65, 0.22), (m - 0.33) * 3.0);
    } else {
      morphed = mix(vec3(0.85, 0.65, 0.22), urbanRoad, (m - 0.66) * 3.0);
    }

    // Basic shading
    float diff = max(dot(N, L), 0.2);
    gl_FragColor = vec4(morphed * diff, uOpacity);
  }
`;
