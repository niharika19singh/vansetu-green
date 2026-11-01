/**
 * ForestWaterShader.js — Unified Photorealistic Living Forest & Tidal Water Shader.
 * 
 * Features:
 * - Proper cover-fit UV mapping preserving 1024x573 aspect ratio across all viewports.
 * - S-curve continuous water mask (smoothstep 0.48 -> 0.36) anchored to physical waterline.
 * - Perspective-correct elliptical water ripples (3.4x vertical foreshortening for horizontal water plane).
 * - Multi-octave anisotropic surface refraction (3.0x vertical-to-horizontal displacement ratio).
 * - Camera depth-gradient: subtle calm waves near horizon, richer refraction in foreground.
 * - Sunlight specular shimmer dancing organically on ripple crests.
 */

export const ForestWaterVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  uniform float uTime;

  void main() {
    vUv = uv;
    vec3 pos = position;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    
    vec4 mvPosition = viewMatrix * worldPos;
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const ForestWaterFragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  uniform sampler2D uForestTex;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uTexResolution; // (1024.0, 573.0)
  uniform vec2 uFocalPoint;    // (0.40, 0.45)
  uniform vec2 uMouse;
  uniform vec4 uRipples[8];    // (x, y, startTime, amplitude)
  uniform float uWaterLevel;   // Default ~0.415

  // Computes aspect-correct cover UV mapping
  vec2 getCoverUv(vec2 screenUv, vec2 screenRes, vec2 texRes, vec2 focal) {
    float screenAspect = screenRes.x / max(screenRes.y, 1.0);
    float texAspect = texRes.x / max(texRes.y, 1.0);

    vec2 scale = vec2(1.0);
    if (screenAspect > texAspect) {
      // Screen is wider than photograph -> fit width, crop height
      scale = vec2(1.0, texAspect / screenAspect);
    } else {
      // Screen is narrower than photograph (mobile portrait/tablet) -> fit height, crop width
      scale = vec2(screenAspect / texAspect, 1.0);
    }

    return (screenUv - focal) * scale + focal;
  }

  // Evaluates water surface wave displacement for public API / test contract
  float getWaterWave(vec2 uv) {
    return sin(uv.x * 14.0 + uTime * 0.45 + uv.y * 7.0) * 0.0012;
  }

  // Multi-octave anisotropic water displacement with depth-gradient
  vec3 getWaterDynamics(vec2 uv, float waterWeight) {
    if (waterWeight <= 0.001) {
      return vec3(0.0);
    }

    // Depth factor: camera distance gradient
    // uv.y ~ 0.42 is the waterline. uv.y -> 0.0 is closer to camera.
    float depthFactor = clamp((0.44 - uv.y) / 0.44, 0.0, 1.0);
    float perspectiveCompression = mix(0.60, 1.0, depthFactor);

    // Slow, natural directional drift
    vec2 flow = vec2(uTime * 0.030, uTime * 0.012);

    // Octave 1: Low-frequency gentle pond swell (calm breathing)
    float n1 = sin((uv.x + flow.x) * 11.0 + (uv.y + flow.y) * 6.5);
    float n1Cross = cos((uv.x - flow.x * 0.75) * 8.0 - (uv.y + flow.y) * 11.0);

    // Octave 2: Mid-frequency diagonal ripples
    float n2 = sin((uv.x - flow.x * 1.1) * 22.0 + (uv.y - flow.y) * 15.0 + n1 * 0.7);
    float n2Cross = cos((uv.x + flow.x * 0.85) * 17.0 - (uv.y + flow.y * 1.1) * 21.0);

    // Octave 3: High-frequency delicate capillary shimmer (subtle texture)
    float n3 = sin((uv.x * 38.0 + uv.y * 28.0) - uTime * 0.55);

    // Anisotropic displacement:
    // Glancing angle perspective causes primarily vertical refraction displacement
    // Vertical-to-horizontal displacement ratio ~ 3.0x
    float dx = (n1 * 0.00040 + n2 * 0.00025 + n3 * 0.00012) * perspectiveCompression;
    float dy = (n1Cross * 0.00120 + n2Cross * 0.00080 + n3 * 0.00038) * perspectiveCompression;

    // Perspective-correct elliptical ripples from dew droplets
    vec2 rippleOffset = vec2(0.0);
    float rippleHighlight = 0.0;

    for (int i = 0; i < 8; i++) {
      vec4 r = uRipples[i];
      if (r.z > 0.0) {
        float elapsed = uTime - r.z;
        if (elapsed > 0.0 && elapsed < 4.5) {
          vec2 diff = uv - r.xy;

          // Perspective foreshortening: horizontal pond surface viewed from ~20 deg elevation
          // Compressing vertical distance by 3.4x projects circular surface waves as horizontal ellipses
          vec2 ellipseDiff = vec2(diff.x, diff.y * 3.4);
          float dist = length(ellipseDiff);

          float waveFront = elapsed * 0.14; // Expansion speed
          float ringWidth = 0.075;

          if (abs(dist - waveFront) < ringWidth) {
            float phase = (dist - waveFront) * 48.0;
            float envelope = smoothstep(ringWidth, 0.0, abs(dist - waveFront));

            // Gentle physical exponential energy dissipation
            float amp = r.w * exp(-dist * 3.2) * exp(-elapsed * 0.80) * 0.0028;

            // Water confinement: smoothly fade ripples before they cross into tree foliage
            float waterConfine = smoothstep(0.45, 0.38, uv.y);

            vec2 dir = normalize(vec2(ellipseDiff.x, ellipseDiff.y * 3.4) + vec2(0.0001));
            rippleOffset += dir * sin(phase) * envelope * amp * waterConfine;
            rippleHighlight += max(0.0, sin(phase)) * envelope * amp * 32.0 * waterConfine;
          }
        }
      }
    }

    dx += rippleOffset.x;
    dy += rippleOffset.y;

    float crest = max(0.0, (n1 + n2) * 0.45) + rippleHighlight;

    return vec3(dx, dy, crest) * waterWeight;
  }

  void main() {
    // 1. Aspect-correct cover UV mapping
    vec2 baseUv = getCoverUv(vUv, uResolution, uTexResolution, uFocalPoint);

    // 2. Continuous water mask anchored to photographic waterline
    float waterWeight = smoothstep(0.48, 0.36, baseUv.y);
    float canopyWeight = 1.0 - waterWeight;

    // 3. Gentle canopy breeze sway (upper foliage)
    float swayX = sin(uTime * 0.32 + baseUv.y * 5.0) * 0.0005 * canopyWeight;
    float swayY = cos(uTime * 0.28 + baseUv.x * 4.0) * 0.0003 * canopyWeight;

    // Subtle mouse parallax
    vec2 parallax = (uMouse - vec2(0.5)) * 0.0035;

    // 4. Fluid anisotropic water dynamics (lower reflective pond)
    vec3 waterDynamics = getWaterDynamics(baseUv, waterWeight);
    vec2 waterDisplacement = waterDynamics.xy;
    float rippleCrests = waterDynamics.z;

    // Seamless UV perturbation
    vec2 perturbedUv = baseUv + vec2(swayX, swayY) + waterDisplacement + parallax;
    perturbedUv = clamp(perturbedUv, vec2(0.001), vec2(0.999));

    // Sample authentic photograph
    vec4 photoColor = texture2D(uForestTex, perturbedUv);

    // 5. Natural lighting & specular shimmer on ripple crests
    float sunSpecular = smoothstep(0.35, 1.0, rippleCrests) * 0.15 * waterWeight;
    vec3 shimmerColor = vec3(1.0, 0.98, 0.90) * sunSpecular;

    // Gentle ambient light breathing on the water surface
    float waterBreathe = sin(uTime * 0.38 + baseUv.x * 3.0) * 0.010 * waterWeight;

    // Morning warmth in upper foliage
    float sunWarmth = sin(uTime * 0.32 + baseUv.y * 3.0) * 0.012 * canopyWeight;

    vec3 finalColor = photoColor.rgb + shimmerColor;
    finalColor += vec3(waterBreathe * 0.7, waterBreathe, waterBreathe * 0.4);
    finalColor += vec3(sunWarmth * 0.8, sunWarmth, sunWarmth * 0.4);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
