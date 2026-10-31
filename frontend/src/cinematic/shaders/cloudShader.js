/**
 * Cloud & Atmospheric Mist GLSL Shader for "Veins of Life".
 * Stage D (45% - 60%): Soft, dreamy volumetric cloud passage with forward sun scattering.
 */

export const CloudVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  uniform float uTime;
  uniform float uDriftSpeed;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Gentle billow & puffing drift
    float billow = sin(uv.x * 6.28 + uTime * 0.8) * cos(uv.y * 6.28 + uTime * 0.6) * 0.15;
    pos.z += billow;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const CloudFragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  uniform float uTime;
  uniform float uCloudAlpha;      // Global cloud opacity (0.0 to 1.0)
  uniform vec3 uSunPosition;
  uniform vec3 uCloudColor;
  uniform vec3 uSunGlowColor;

  // 2D Simplex / Perlin noise approximation
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
          + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Fractal Brownian Motion (FBM) for soft layered volumetric clouds
  float fbm(vec2 p) {
    float total = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
      total += snoise(p * freq) * amp;
      p += vec2(uTime * 0.03, uTime * 0.02);
      freq *= 2.0;
      amp *= 0.5;
    }
    return total * 0.5 + 0.5;
  }

  void main() {
    // Soft radial feathering from center of disc/plane
    float dist = length(vUv - vec2(0.5));
    float radialMask = smoothstep(0.5, 0.05, dist);

    // Multi-octave cloud density
    vec2 uvCoord = vUv * 3.5 + vec2(uTime * 0.05, sin(uTime * 0.03) * 0.1);
    float cloudNoise = fbm(uvCoord);
    float fineDetail = fbm(uvCoord * 2.5 + vec2(1.5, 2.7));
    float density = mix(cloudNoise, fineDetail, 0.35) * radialMask;

    if (density < 0.05 || uCloudAlpha <= 0.001) {
      discard;
    }

    // Forward light scattering (sun shining through clouds creates warm silver/golden rim)
    vec3 L = normalize(uSunPosition - vWorldPosition);
    vec3 V = normalize(-vWorldPosition);
    float forwardScatter = pow(max(dot(V, L), 0.0), 3.0);

    vec3 cloudBase = mix(uCloudColor, vec3(0.96, 0.98, 1.0), density);
    vec3 sunlitCloud = mix(cloudBase, uSunGlowColor, forwardScatter * 0.65);

    // Subtle emerald-amber tint reflecting the leaf below and the sun above
    vec3 etherealTint = mix(sunlitCloud, vec3(0.85, 0.95, 0.78), 0.2);

    float finalAlpha = smoothstep(0.08, 0.65, density) * uCloudAlpha * radialMask;
    gl_FragColor = vec4(etherealTint, finalAlpha);
  }
`;
