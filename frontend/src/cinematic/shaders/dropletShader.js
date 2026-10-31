/**
 * Physically-Based Water Droplet Shader for "Veins of Life".
 * Implements IOR 1.333 refraction, Fresnel rim reflection, contact shadows,
 * specular sunlight highlights, and vein magnification beneath the droplet.
 */

export const DropletVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  uniform float uTime;
  uniform float uApproachProgress;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Subtle fluid tension breathing
    float wobble = sin(uTime * 2.0 + position.x * 4.0) * 0.015;
    pos += normal * wobble;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    
    vec4 mvPosition = viewMatrix * worldPos;
    vViewPosition = -mvPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const DropletFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  uniform sampler2D uLeafTex;
  uniform vec3 uSunPosition;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uMagnification;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewPosition);
    vec3 L = normalize(uSunPosition - vWorldPosition);

    // Fresnel reflectance (Schlick approximation for water n=1.333, F0 ~ 0.02)
    float F0 = 0.020;
    float cosTheta = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);

    // Refraction: Snell's law distortion mapping underlying leaf texture
    // Eta = 1.0 / 1.333 = 0.75
    vec3 R_refract = refract(-V, N, 0.75);
    
    // Calculate refracted UV on the leaf beneath with optical magnification
    vec2 refractedUv = vUv + R_refract.xy * (0.18 + uMagnification * 0.22);
    // Magnified center: zoom in on the underlying leaf vein reticulation
    refractedUv = mix(refractedUv, vec2(0.68, 0.42), 0.25 * uMagnification);

    vec4 underlyingLeaf = texture2D(uLeafTex, refractedUv);
    
    // Internal liquid tint: crystal clear water with slight emerald-lime glow from the leaf beneath
    vec3 waterTint = vec3(0.92, 1.0, 0.95);
    vec3 refractedColor = underlyingLeaf.rgb * waterTint * 1.15;

    // Primary Specular highlight (Crisp sunlight reflection)
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 128.0);
    vec3 sunSpecColor = vec3(1.0, 0.97, 0.88) * spec * 2.2;

    // Secondary soft ambient bounce highlight
    float softSpec = pow(max(dot(N, H), 0.0), 16.0) * 0.25;

    // Sky/ambient reflection along the curved water meniscus
    vec3 skyReflectColor = mix(vec3(0.85, 0.95, 1.0), vec3(1.0, 0.95, 0.85), N.y);

    // Composite: Refracted interior + Fresnel sky reflection + Sun specular highlight
    vec3 finalColor = mix(refractedColor, skyReflectColor, fresnel * 0.85);
    finalColor += sunSpecColor + softSpec;

    // Natural meniscus rim glow
    float meniscusRim = pow(1.0 - cosTheta, 2.5) * 0.5;
    finalColor += vec3(0.8, 1.0, 0.85) * meniscusRim;

    gl_FragColor = vec4(finalColor, uOpacity);
  }
`;
