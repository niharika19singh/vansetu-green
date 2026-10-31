/**
 * ForestWaterShader.js — Unified Photorealistic Living Forest & Tidal Water Shader.
 * 
 * Continuous, seamless environmental simulation:
 * - NO artificial cuts, splits, or seams between foliage and pond.
 * - Samples the authentic forest photograph continuously across the entire canvas.
 * - Smooth vertical water weighting: blends smoothly from the upper canopy down to the reflective water surface.
 * - Gentle, natural fluid optical refraction: slow tide-like swelling, micro-capillary waves, and concentric ripples.
 * - Organic morning sunlight shimmer on ripple crests with delicate ambient breathing.
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
  uniform vec2 uMouse;
  uniform vec4 uRipples[8]; // (x, y, startTime, amplitude)
  uniform float uWaterLevel; // Default ~0.415

  // Evaluates water surface wave displacement
  float getWaterWave(vec2 uv) {
    return sin(uv.x * 14.0 + uTime * 0.45 + uv.y * 7.0) * 0.0012;
  }

  // Computes continuous multi-frequency wave height and optical normal perturbation
  vec3 getWaterDynamics(vec2 uv, float waterWeight) {
    if (waterWeight <= 0.001) {
      return vec3(0.0, 0.0, 0.0); // (dx, dy, crest)
    }

    // 1. Slow, gentle rolling tide swell (natural pond breathing)
    float wave1X = sin(uv.x * 14.0 + uTime * 0.45 + uv.y * 7.0);
    float wave1Y = cos(uv.x * 9.0 + uTime * 0.40 - uv.y * 12.0);

    // 2. Cross gentle diagonal ripple
    float wave2X = cos(uv.x * 24.0 - uv.y * 16.0 + uTime * 0.65);
    float wave2Y = sin(uv.x * 18.0 + uv.y * 22.0 - uTime * 0.55);

    // 3. Fine capillary surface oscillation
    float wave3 = sin(uv.x * 48.0 + uv.y * 32.0 - uTime * 0.85);

    // Combine into gentle surface gradients (dx, dy)
    float dx = (wave1X * 0.0012 + wave2X * 0.0008 + wave3 * 0.0004);
    float dy = (wave1Y * 0.0010 + wave2Y * 0.0007 + wave3 * 0.0003);

    // Ripple packets from falling dew droplets
    vec2 rippleOffset = vec2(0.0);
    float rippleHighlight = 0.0;

    for (int i = 0; i < 8; i++) {
      vec4 r = uRipples[i];
      if (r.z > 0.0) {
        float elapsed = uTime - r.z;
        if (elapsed > 0.0 && elapsed < 4.8) {
          // Compensate for ~16:9 aspect ratio so ripples remain perfectly circular
          vec2 diff = (uv - r.xy) * vec2(1.78, 1.0);
          float dist = length(diff);
          float waveFront = elapsed * 0.16; // Gentle expansion speed
          float ringWidth = 0.09;

          if (abs(dist - waveFront) < ringWidth) {
            float phase = (dist - waveFront) * 48.0;
            float envelope = smoothstep(ringWidth, 0.0, abs(dist - waveFront));
            float amp = r.w * exp(-dist * 2.8) * exp(-elapsed * 0.75) * 0.0035;

            vec2 dir = normalize(diff + vec2(0.0001));
            rippleOffset += dir * sin(phase) * envelope * amp;
            rippleHighlight += max(0.0, sin(phase)) * envelope * amp * 35.0;
          }
        }
      }
    }

    dx += rippleOffset.x;
    dy += rippleOffset.y;

    float crest = max(0.0, (wave1X + wave2X) * 0.5) + rippleHighlight;

    return vec3(dx, dy, crest) * waterWeight;
  }

  void main() {
    // =========================================================================
    // 1. CONTINUOUS WATER MASK (NO HARSH SEAM / NO SPLIT)
    // =========================================================================
    // In the photograph, the pond is in the lower portion.
    // We blend smoothly across the shoreline transition zone (0.47 down to 0.36)
    float waterWeight = smoothstep(0.48, 0.36, vUv.y);
    float canopyWeight = 1.0 - waterWeight;

    // =========================================================================
    // 2. GENTLE CANOPY BREEZE SWAY (UPPER FOLIAGE)
    // =========================================================================
    float swayX = sin(uTime * 0.35 + vUv.y * 5.0) * 0.0006 * canopyWeight;
    float swayY = cos(uTime * 0.30 + vUv.x * 4.0) * 0.0004 * canopyWeight;

    // Subtle mouse parallax
    vec2 parallax = (uMouse - vec2(0.5)) * 0.004;

    // =========================================================================
    // 3. FLUID WATER DYNAMICS (LOWER REFLECTIVE POND)
    // =========================================================================
    vec3 waterDynamics = getWaterDynamics(vUv, waterWeight);
    vec2 waterDisplacement = waterDynamics.xy;
    float rippleCrests = waterDynamics.z;

    // Total seamless UV perturbation:
    // Blends smoothly from gentle canopy breeze sway at the top
    // down to natural fluid wave refraction at the bottom
    vec2 perturbedUv = vUv + vec2(swayX, swayY) + waterDisplacement + parallax;
    perturbedUv = clamp(perturbedUv, vec2(0.001), vec2(0.999));

    // Sample authentic photograph with seamless fluid refraction
    vec4 photoColor = texture2D(uForestTex, perturbedUv);

    // =========================================================================
    // 4. NATURAL LIGHTING & SPECULAR SHIMMER
    // =========================================================================
    // Morning sun direction from upper center-right
    // Specular highlights dancing gently on ripple crests
    float sunSpecular = smoothstep(0.35, 1.0, rippleCrests) * 0.16 * waterWeight;
    vec3 shimmerColor = vec3(1.0, 0.98, 0.90) * sunSpecular;

    // Gentle ambient light breathing on the water surface
    float waterBreathe = sin(uTime * 0.4 + vUv.x * 3.0) * 0.012 * waterWeight;

    // Filtered morning sun warmth in upper foliage
    float sunWarmth = sin(uTime * 0.35 + vUv.y * 3.0) * 0.015 * canopyWeight;

    vec3 finalColor = photoColor.rgb + shimmerColor;
    finalColor += vec3(waterBreathe * 0.7, waterBreathe, waterBreathe * 0.4);
    finalColor += vec3(sunWarmth * 0.8, sunWarmth, sunWarmth * 0.4);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
