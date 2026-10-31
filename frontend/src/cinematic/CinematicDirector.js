/**
 * CinematicDirector.js — 7-Stage Continuous 3D Engine for "Veins of Life".
 * Sequence:
 * 1. Leaf and droplets (0–15%)
 * 2. Approach main bubble (15–30%)
 * 3. Enter and pass through bubble (30–45%)
 * 4. Move through clouds (45–60%) [NEW]
 * 5. Veins begin appearing (60–75%)
 * 6. Veins transform into Delhi streets (75–90%)
 * 7. Final Delhi roadmap reveal (90–100%)
 */
import * as THREE from 'three';
import { clamp, lerp, smoothstep, remap } from './mathUtils';
import { LeafVertexShader, LeafFragmentShader } from './shaders/leafShader';
import { DropletVertexShader, DropletFragmentShader } from './shaders/dropletShader';
import { MorphVeinVertexShader, MorphVeinFragmentShader } from './shaders/morphShader';
import { CloudVertexShader, CloudFragmentShader } from './shaders/cloudShader';
import { buildDelhiRoad3DData, DELHI_LANDMARKS } from './delhiNetwork';
import { generateVeinNetwork } from './veinNetwork';
import { cinematicAudio } from './audioSynth';

export class CinematicDirector {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.onProgressChange = options.onProgressChange || (() => {});
    this.onCorridorSelect = options.onCorridorSelect || (() => {});
    this.onLandmarkSelect = options.onLandmarkSelect || (() => {});

    // State
    this.progress = 0.0;
    this.targetProgress = 0.0;
    this.isInteractiveMapMode = false;
    this.orbitAngles = { theta: 0, phi: 0.68, radius: 22 };
    this.panOffset = new THREE.Vector3(0, 0, 0);
    this.isDragging = false;
    this.lastPointer = { x: 0, y: 0 };
    this.clock = new THREE.Clock();

    // Scene setup
    this.scene = new THREE.Scene();

    // Camera
    const width = canvasElement.clientWidth || window.innerWidth || 1920;
    const height = canvasElement.clientHeight || window.innerHeight || 1080;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.05, 500);
    this.camera.position.set(0.15, 3.8, 6.8);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    // Groups
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    this.leafGroup = new THREE.Group();
    this.dropletGroup = new THREE.Group();
    this.cloudGroup = new THREE.Group();
    this.veinGroup = new THREE.Group();
    this.cityGroup = new THREE.Group();
    this.particleGroup = new THREE.Group();

    this.worldGroup.add(this.leafGroup);
    this.worldGroup.add(this.dropletGroup);
    this.worldGroup.add(this.cloudGroup);
    this.worldGroup.add(this.veinGroup);
    this.worldGroup.add(this.cityGroup);
    this.worldGroup.add(this.particleGroup);

    // Dynamic Lighting
    this.sunLight = new THREE.DirectionalLight('#fffbeb', 3.2);
    this.sunLight.position.set(8.0, 6.5, 4.0); // Warm right golden sunlight
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight('#084d28', 1.6); // Emerald ambient bounce
    this.scene.add(this.ambientLight);

    this.fillLight = new THREE.DirectionalLight('#059669', 1.1);
    this.fillLight.position.set(-6.0, 2.5, -2.0);
    this.scene.add(this.fillLight);

    // Textures & Asset Loading
    this.textureLoader = new THREE.TextureLoader();
    this.initAssets();
    this.initEvents();

    this.animate = this.animate.bind(this);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  initAssets() {
    // 1. High-Resolution Leaf Cover Texture (Exact User Photo)
    const leafTex = this.textureLoader.load(
      '/textures/leaf_cover.jpg',
      (tex) => {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.generateMipmaps = true;
        if (this.leafMaterial) {
          this.leafMaterial.uniforms.uLeafTex.value = tex;
        }
        if (this.dropletMaterial) {
          this.dropletMaterial.uniforms.uLeafTex.value = tex;
        }
      },
      undefined,
      () => {
        // Fallback to leaf_reference.jpg
        this.textureLoader.load('/textures/leaf_reference.jpg', (tex) => {
          if (this.leafMaterial) this.leafMaterial.uniforms.uLeafTex.value = tex;
          if (this.dropletMaterial) this.dropletMaterial.uniforms.uLeafTex.value = tex;
        });
      }
    );

    // 2. City Map Texture (Reference Image 2)
    const mapTex = this.textureLoader.load(
      '/textures/delhi_map_reference.png',
      (tex) => {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        if (this.leafMaterial) {
          this.leafMaterial.uniforms.uMapTex.value = tex;
        }
      }
    );

    // Build Scene Geometry
    this.buildLeafEnvironment(leafTex, mapTex);
    this.buildWaterDroplets(leafTex);
    this.buildCloudTunnel();
    this.buildMicroParticles();

    // Load Delhi GeoJSON and build Vein-to-Road network
    fetch('/delhi_roads.geojson')
      .then((res) => res.json())
      .then((geojson) => {
        this.delhiData = buildDelhiRoad3DData(geojson);
        this.veinData = generateVeinNetwork(this.delhiData.corridors);
        this.buildVeinAndRoadGeometry(this.veinData, this.delhiData);
      })
      .catch((e) => {
        console.warn('Fallback synthetic corridors', e);
        this.delhiData = { segments: [], corridors: [] };
        this.veinData = generateVeinNetwork([]);
        this.buildVeinAndRoadGeometry(this.veinData, this.delhiData);
      });
  }

  buildLeafEnvironment(leafTex, mapTex) {
    // 16x22 Plane matching the leaf portrait aspect ratio
    const geometry = new THREE.PlaneGeometry(16, 22, 96, 96);
    geometry.rotateX(-Math.PI * 0.46);

    this.leafMaterial = new THREE.ShaderMaterial({
      vertexShader: LeafVertexShader,
      fragmentShader: LeafFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uSunPosition: { value: this.sunLight.position },
        uLeafTex: { value: leafTex },
        uMapTex: { value: mapTex },
        uDropletEntryProgress: { value: 0 },
      },
      side: THREE.DoubleSide,
    });

    this.leafMesh = new THREE.Mesh(geometry, this.leafMaterial);
    this.leafMesh.position.set(0, 0, 0);
    this.leafGroup.add(this.leafMesh);
  }

  buildWaterDroplets(leafTex) {
    // Focal water droplet (slightly right of center: x=1.35, y=0.38, z=0.45)
    const dropletGeo = new THREE.SphereGeometry(0.72, 48, 48);
    dropletGeo.scale(1.0, 0.58, 1.0);

    this.dropletMaterial = new THREE.ShaderMaterial({
      vertexShader: DropletVertexShader,
      fragmentShader: DropletFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uLeafTex: { value: leafTex },
        uSunPosition: { value: this.sunLight.position },
        uOpacity: { value: 0.98 },
        uMagnification: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
    });

    this.mainDroplet = new THREE.Mesh(dropletGeo, this.dropletMaterial);
    this.mainDroplet.position.set(1.35, 0.38, 0.45);
    this.dropletGroup.add(this.mainDroplet);

    // Droplet soft contact shadow
    const shadowGeo = new THREE.CircleGeometry(0.75, 32);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x022c15,
      transparent: true,
      opacity: 0.55,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(1.35, 0.08, 0.45);
    this.dropletGroup.add(shadowMesh);

    // Scattered natural micro-droplets
    const microDropletPositions = [
      { x: -1.8, y: 0.12, z: 2.2, r: 0.22 },
      { x: -0.6, y: 0.18, z: 1.4, r: 0.16 },
      { x: 0.2, y: 0.15, z: 3.1, r: 0.18 },
      { x: 2.1, y: 0.14, z: -1.2, r: 0.28 },
      { x: 2.4, y: 0.16, z: 1.8, r: 0.25 },
      { x: 1.8, y: 0.15, z: 2.9, r: 0.32 },
      { x: 1.1, y: 0.12, z: 4.2, r: 0.24 },
      { x: -2.5, y: 0.14, z: -1.5, r: 0.2 },
      { x: -1.2, y: 0.16, z: -2.8, r: 0.26 },
    ];

    microDropletPositions.forEach((dp) => {
      const g = new THREE.SphereGeometry(dp.r, 24, 24);
      g.scale(1.0, 0.55, 1.0);
      const m = new THREE.Mesh(g, this.dropletMaterial);
      m.position.set(dp.x, dp.y, dp.z);
      this.dropletGroup.add(m);
    });
  }

  /**
   * Stage D: Volumetric Soft Cloud Tunnel (45% - 60%)
   * Airy, cinematic mist layers drifting between bubble exit and vein entrance.
   */
  buildCloudTunnel() {
    this.cloudMaterials = [];
    const numCloudLayers = 14;
    const cloudGeo = new THREE.PlaneGeometry(6.5, 6.5, 16, 16);

    for (let i = 0; i < numCloudLayers; i++) {
      const frac = i / (numCloudLayers - 1);
      // Positioned along the camera path between z = 0.3 down to z = -3.2
      const zPos = lerp(0.35, -3.2, frac);
      const xPos = lerp(1.35, 0.2, frac) + (Math.sin(frac * 6.28) * 0.45);
      const yPos = lerp(0.45, 0.75, frac) + (Math.cos(frac * 4.0) * 0.25);

      const mat = new THREE.ShaderMaterial({
        vertexShader: CloudVertexShader,
        fragmentShader: CloudFragmentShader,
        uniforms: {
          uTime: { value: i * 1.5 },
          uCloudAlpha: { value: 0.0 },
          uDriftSpeed: { value: 0.5 + Math.random() * 0.5 },
          uSunPosition: { value: this.sunLight.position },
          uCloudColor: { value: new THREE.Color('#f0fdf4') }, // Airy mist
          uSunGlowColor: { value: new THREE.Color('#fef08a') }, // Golden sunlit edge
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(cloudGeo, mat);
      mesh.position.set(xPos, yPos, zPos);
      mesh.rotation.z = Math.random() * Math.PI;
      // Slight billboard tilt towards incoming camera
      mesh.rotation.x = -0.15 + (Math.random() - 0.5) * 0.2;

      this.cloudGroup.add(mesh);
      this.cloudMaterials.push(mat);
    }
  }

  buildMicroParticles() {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = Math.random() * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
      scales[i] = Math.random() * 0.04 + 0.01;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    const material = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.08,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.particleGroup.add(this.particles);
  }

  buildVeinAndRoadGeometry(veinData, delhiData) {
    this.morphMeshes = [];

    veinData.morphPairs.forEach((pair, idx) => {
      const numPoints = pair.organic.length;
      const organicCurve = new THREE.CatmullRomCurve3(pair.organic);
      const urbanCurve = new THREE.CatmullRomCurve3(pair.urban);

      // Slimmer vein/road geometry so the cinematic scene stays elegant and does not read as thick tentacle-like pipes.
      const radius = idx === 0 ? 0.055 : 0.024;
      const tubeSegments = Math.min(64, numPoints * 2);
      const radialSegments = 8;

      const baseGeo = new THREE.TubeGeometry(organicCurve, tubeSegments, radius, radialSegments, false);
      const urbanGeo = new THREE.TubeGeometry(urbanCurve, tubeSegments, radius, radialSegments, false);
      const urbanPositions = urbanGeo.attributes.position.clone();
      baseGeo.setAttribute('aUrbanPos', urbanPositions);

      const corridorColor = new THREE.Color(
        delhiData.corridors[idx % Math.max(1, delhiData.corridors.length)]?.color || '#f97316'
      );

      const morphMat = new THREE.ShaderMaterial({
        vertexShader: MorphVeinVertexShader,
        fragmentShader: MorphVeinFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: 0 },
          uOpacity: { value: 0.0 },
          uSunPosition: { value: this.sunLight.position },
          uCorridorColor: { value: corridorColor },
        },
        side: THREE.DoubleSide,
        transparent: true,
      });

      const mesh = new THREE.Mesh(baseGeo, morphMat);
      mesh.visible = false;
      mesh.userData = {
        isCorridor: true,
        corridorId: delhiData.corridors[idx % Math.max(1, delhiData.corridors.length)]?.id,
        name: pair.name,
      };
      this.veinGroup.add(mesh);
      this.morphMeshes.push(mesh);
    });

    // Delhi Road Linework Layer
    if (delhiData.segments && delhiData.segments.length > 0) {
      const linePositions = [];
      const lineColors = [];
      const colorArterial = new THREE.Color('#fed7aa');
      const colorPedestrian = new THREE.Color('#4ade80');
      const colorPrimary = new THREE.Color('#fdba74');

      delhiData.segments.forEach((seg) => {
        linePositions.push(seg.p1.x, seg.p1.y + 0.02, seg.p1.z);
        linePositions.push(seg.p2.x, seg.p2.y + 0.02, seg.p2.z);

        const col =
          seg.type === 'pedestrian'
            ? colorPedestrian
            : seg.type === 'primary' || seg.type === 'motorway'
            ? colorArterial
            : colorPrimary;
        lineColors.push(col.r, col.g, col.b);
        lineColors.push(col.r, col.g, col.b);
      });

      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

      this.cityLinesMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 2,
        transparent: true,
        opacity: 0.0,
      });

      this.cityLines = new THREE.LineSegments(lineGeo, this.cityLinesMat);
      this.cityGroup.add(this.cityLines);
    }

    this.buildLandmarkPins();
  }

  buildLandmarkPins() {
    this.landmarkSprites = [];
    const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 12);
    const pinHeadGeo = new THREE.SphereGeometry(0.22, 16, 16);

    DELHI_LANDMARKS.forEach((lm) => {
      const group = new THREE.Group();
      const pos = lm.id === 'pragati_maidan'
        ? new THREE.Vector3(1.2, 0, -0.6)
        : lm.id === 'new_delhi'
        ? new THREE.Vector3(-0.4, 0, 0.8)
        : lm.id === 'rajpath'
        ? new THREE.Vector3(0.0, 0, 0.1)
        : new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4);

      const pinMat = new THREE.MeshStandardMaterial({
        color: lm.type === 'capital' ? 0xef4444 : 0xf59e0b,
        emissive: lm.type === 'capital' ? 0x991b1b : 0xb45309,
        roughness: 0.3,
      });
      const shaft = new THREE.Mesh(pinGeo, pinMat);
      shaft.position.y = 0.4;
      group.add(shaft);

      const head = new THREE.Mesh(pinHeadGeo, pinMat);
      head.position.y = 0.85;
      group.add(head);

      group.position.copy(pos);
      group.userData = { isLandmark: true, landmark: lm };
      this.cityGroup.add(group);
      this.landmarkSprites.push(group);
    });
  }

  initEvents() {
    this.handleWheel = (e) => {
      if (this.isInteractiveMapMode) {
        e.preventDefault();
        this.orbitAngles.radius = clamp(this.orbitAngles.radius + e.deltaY * 0.02, 6, 45);
      }
    };

    this.handlePointerDown = (e) => {
      if (!this.isInteractiveMapMode) return;
      this.isDragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    };

    this.handlePointerMove = (e) => {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!this.isDragging || !this.isInteractiveMapMode) return;

      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.lastPointer = { x: e.clientX, y: e.clientY };

      if (e.buttons === 1) {
        this.orbitAngles.theta -= dx * 0.006;
        this.orbitAngles.phi = clamp(this.orbitAngles.phi - dy * 0.004, 0.25, 1.45);
      } else if (e.buttons === 2) {
        this.panOffset.x -= dx * 0.02;
        this.panOffset.z -= dy * 0.02;
      }
    };

    this.handlePointerUp = () => {
      this.isDragging = false;
    };

    this.handleClick = () => {
      if (this.isInteractiveMapMode && this.progress > 0.75) {
        this.raycastCheck();
      }
    };

    this.handleResize = () => {
      if (!this.canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('resize', this.handleResize);
  }

  raycastCheck() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.worldGroup.children, true);

    for (let hit of intersects) {
      let obj = hit.object;
      while (obj && obj !== this.worldGroup) {
        if (obj.userData?.isLandmark) {
          this.onLandmarkSelect(obj.userData.landmark);
          return;
        }
        if (obj.userData?.isCorridor) {
          this.onCorridorSelect(obj.userData.corridorId);
          return;
        }
        obj = obj.parent;
      }
    }
  }

  setProgress(val) {
    this.targetProgress = clamp(val, 0, 1);
  }

  setInteractiveMode(enabled) {
    this.isInteractiveMapMode = enabled;
  }

  /**
   * 7-Stage Continuous Camera & Shader Synchronization:
   * 0–15%:   Leaf and droplets
   * 15–30%:  Approach main bubble
   * 30–45%:  Enter and pass through bubble
   * 45–60%:  Move through clouds
   * 60–75%:  Veins begin appearing
   * 75–90%:  Veins transform into Delhi streets
   * 90–100%: Final Delhi roadmap reveal
   */
  updateCameraSpline(t) {
    let camPos = new THREE.Vector3();
    let camLookAt = new THREE.Vector3();
    let dropletOpacity = 1.0;
    let cloudAlpha = 0.0;
    let morphFactor = 0.0;
    let morphOpacity = 0.0;
    let cityLinesAlpha = 0.0;
    let dropletEntryProgress = 0.0;

    const dropletCenter = new THREE.Vector3(1.35, 0.38, 0.45);

    if (t < 0.15) {
      // Stage 1: Leaf and droplets (0–15%)
      const subT = remap(t, 0.0, 0.15, 0.0, 1.0);
      camPos.set(
        lerp(0.15, 0.35, subT),
        lerp(3.8, 3.4, subT),
        lerp(6.8, 5.5, subT)
      );
      camLookAt.set(0.5, 0.3, 0.2);
      dropletOpacity = 0.98;
      cloudAlpha = 0.0;
      morphFactor = 0.0;
      morphOpacity = 0.0;
      cityLinesAlpha = 0.0;
    } else if (t < 0.30) {
      // Stage 2: Approach main bubble (15–30%)
      const subT = remap(t, 0.15, 0.30, 0.0, 1.0);
      const easeSubT = smoothstep(0, 1, subT);
      camPos.set(
        lerp(0.35, 1.35, easeSubT),
        lerp(3.4, 0.95, easeSubT),
        lerp(5.5, 1.35, easeSubT)
      );
      camLookAt.copy(dropletCenter);
      dropletOpacity = lerp(0.98, 0.88, subT);
      cloudAlpha = 0.0;
      morphFactor = 0.0;
      morphOpacity = 0.0;
      cityLinesAlpha = 0.0;
    } else if (t < 0.45) {
      // Stage 3: Enter and pass through bubble (30–45%)
      const subT = remap(t, 0.30, 0.45, 0.0, 1.0);
      dropletEntryProgress = subT;
      camPos.set(
        1.35,
        lerp(0.95, 0.36, subT),
        lerp(1.35, 0.38, subT)
      );
      camLookAt.set(1.35, 0.15, 0.45);
      dropletOpacity = lerp(0.88, 0.02, subT);
      // Clouds begin fading in gently as camera exits the droplet meniscus
      cloudAlpha = smoothstep(0.5, 1.0, subT) * 0.65;
      morphFactor = 0.0;
      morphOpacity = 0.0;
      cityLinesAlpha = 0.0;

      if (subT > 0.45 && subT < 0.55) {
        cinematicAudio.triggerDropletImpact();
      }
    } else if (t < 0.60) {
      // Stage 4: Move through clouds (45–60%) [NEW]
      const subT = remap(t, 0.45, 0.60, 0.0, 1.0);
      const easeSubT = smoothstep(0, 1, subT);
      camPos.set(
        lerp(1.35, 0.35, easeSubT),
        lerp(0.36, 0.65, easeSubT),
        lerp(0.38, -1.8, easeSubT)
      );
      camLookAt.set(
        lerp(1.35, 0.15, easeSubT),
        0.25,
        lerp(0.45, -3.8, easeSubT)
      );
      dropletOpacity = 0.0;
      // High cloud mist density while drifting through the ethereal tunnel
      cloudAlpha = 0.88 * Math.sin(subT * Math.PI * 0.9 + 0.15);
      morphFactor = 0.05;
      morphOpacity = 0.0;
      cityLinesAlpha = 0.0;
    } else if (t < 0.75) {
      // Stage 5: Veins begin appearing (60–75%)
      const subT = remap(t, 0.60, 0.75, 0.0, 1.0);
      const easeSubT = smoothstep(0, 1, subT);
      camPos.set(
        lerp(0.35, 0.1, easeSubT),
        lerp(0.65, 1.2, easeSubT),
        lerp(-1.8, -3.5, easeSubT)
      );
      camLookAt.set(
        0.0,
        0.2,
        lerp(-3.8, -6.5, easeSubT)
      );
      dropletOpacity = 0.0;
      // Clouds clear away smoothly, parting to reveal giant biological veins
      cloudAlpha = lerp(0.65, 0.0, smoothstep(0.0, 0.6, subT));
      morphFactor = lerp(0.05, 0.35, subT);
      morphOpacity = lerp(0.0, 0.72, smoothstep(0.18, 0.75, subT));
      cityLinesAlpha = 0.0;
    } else if (t < 0.90) {
      // Stage 6: Veins transform into Delhi streets (75–90%)
      const subT = remap(t, 0.75, 0.90, 0.0, 1.0);
      const easeSubT = smoothstep(0, 1, subT);
      camPos.set(
        lerp(0.1, 0.0, easeSubT),
        lerp(1.2, 9.8, easeSubT),
        lerp(-3.5, 4.2, easeSubT)
      );
      camLookAt.set(0.0, 0.0, 0.0);
      dropletOpacity = 0.0;
      cloudAlpha = 0.0;
      morphFactor = lerp(0.35, 0.98, subT);
      morphOpacity = lerp(0.72, 0.18, subT);
      cityLinesAlpha = lerp(0.0, 0.85, subT);
    } else {
      // Stage 7: Final Delhi roadmap reveal (90–100%)
      const subT = remap(t, 0.90, 1.0, 0.0, 1.0);
      morphFactor = 1.0;
      dropletOpacity = 0.0;
      cloudAlpha = 0.0;
      morphOpacity = 0.0;
      cityLinesAlpha = 1.0;

      if (this.isInteractiveMapMode) {
        const r = this.orbitAngles.radius;
        const phi = this.orbitAngles.phi;
        const theta = this.orbitAngles.theta;
        camPos.set(
          this.panOffset.x + r * Math.sin(phi) * Math.sin(theta),
          this.panOffset.y + r * Math.cos(phi),
          this.panOffset.z + r * Math.sin(phi) * Math.cos(theta)
        );
        camLookAt.copy(this.panOffset);
      } else {
        camPos.set(0.0, lerp(9.8, 19.5, subT), lerp(4.2, 12.8, subT));
        camLookAt.set(0.0, 0.0, 0.0);
      }
    }

    this.camera.position.lerp(camPos, 0.12);
    this.camera.lookAt(camLookAt);

    // Update shaders
    if (this.leafMaterial) {
      this.leafMaterial.uniforms.uMorph.value = morphFactor;
      this.leafMaterial.uniforms.uDropletEntryProgress.value = dropletEntryProgress;
    }

    if (this.dropletMaterial) {
      this.dropletMaterial.uniforms.uOpacity.value = dropletOpacity;
      this.dropletMaterial.uniforms.uMagnification.value = 1.0 + t * 2.8;
    }

    // Update cloud materials
    if (this.cloudMaterials) {
      this.cloudMaterials.forEach((cMat) => {
        cMat.uniforms.uCloudAlpha.value = cloudAlpha;
      });
    }

    if (this.morphMeshes) {
      this.morphMeshes.forEach((m) => {
        const uniforms = m.material?.uniforms;
        m.visible = morphOpacity > 0.01;
        if (uniforms?.uMorph) {
          uniforms.uMorph.value = morphFactor;
        }
        if (uniforms?.uOpacity) {
          uniforms.uOpacity.value = morphOpacity;
        }
      });
    }

    if (this.cityLinesMat) {
      this.cityLinesMat.opacity = cityLinesAlpha;
    }

    cinematicAudio.updateProgress(t);
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.progress = lerp(this.progress, this.targetProgress, 0.09);
    this.updateCameraSpline(this.progress);

    if (this.leafMaterial) {
      this.leafMaterial.uniforms.uTime.value = elapsedTime;
    }
    if (this.dropletMaterial) {
      this.dropletMaterial.uniforms.uTime.value = elapsedTime;
    }
    if (this.cloudMaterials) {
      this.cloudMaterials.forEach((cMat, i) => {
        cMat.uniforms.uTime.value = elapsedTime + i * 0.4;
      });
    }
    if (this.morphMeshes) {
      this.morphMeshes.forEach((m) => {
        if (m.material?.uniforms?.uTime) {
          m.material.uniforms.uTime.value = elapsedTime;
        }
      });
    }

    if (this.particles) {
      this.particles.rotation.y = elapsedTime * 0.02;
    }

    this.sunLight.position.x = 8.0 + Math.sin(elapsedTime * 0.2) * 0.8;

    this.renderer.render(this.scene, this.camera);
    this.onProgressChange(this.progress);
  }

  destroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}
