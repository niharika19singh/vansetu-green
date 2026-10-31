/**
 * LivingForestDirector.js — Three.js Scene Engine for The Living Forest.
 * Manages the photorealistic forest backdrop, continuous fluid water surface,
 * falling dew droplet physics, and subtle sunlight particle drift.
 */
import * as THREE from 'three';
import { ForestWaterVertexShader, ForestWaterFragmentShader } from './shaders/forestWaterShader';
import { forestAudio } from './forestAudio';

export class LivingForestDirector {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.onRippleImpact = options.onRippleImpact || (() => {});

    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2(0.5, 0.5);
    this.targetMouse = new THREE.Vector2(0.5, 0.5);

    // Active ripple pool (max 8)
    this.ripples = [];
    for (let i = 0; i < 8; i++) {
      this.ripples.push(new THREE.Vector4(0, 0, -100, 0)); // x, y, startTime, amplitude
    }
    this.rippleIndex = 0;

    // Falling droplet pool
    this.fallingDroplets = [];
    this.nextDropTime = 2.5;

    // Scene & Camera
    this.scene = new THREE.Scene();

    const width = canvasElement.clientWidth || window.innerWidth || 1920;
    const height = canvasElement.clientHeight || window.innerHeight || 1080;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.set(0, 0, 1);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;

    // Load Forest Reference Texture
    this.textureLoader = new THREE.TextureLoader();
    this.initForestScene();
    this.initParticles();
    this.initEvents();

    this.animate = this.animate.bind(this);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  initForestScene() {
    const primaryUrl = 'https://i.pinimg.com/1200x/f3/2d/44/f32d449cc721be356efb6dad47834669.jpg';
    const fallbackUrl = '/textures/landing_forest_background.jpg';

    const forestTex = this.textureLoader.load(
      primaryUrl,
      (tex) => {
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
      },
      undefined,
      () => {
        // Fallback to local copy if remote image fails or is blocked
        this.textureLoader.load(fallbackUrl, (fallbackTex) => {
          fallbackTex.generateMipmaps = true;
          fallbackTex.minFilter = THREE.LinearMipmapLinearFilter;
          fallbackTex.magFilter = THREE.LinearFilter;
          fallbackTex.wrapS = THREE.ClampToEdgeWrapping;
          fallbackTex.wrapT = THREE.ClampToEdgeWrapping;
          if (this.forestMaterial) {
            this.forestMaterial.uniforms.uForestTex.value = fallbackTex;
          }
        });
      }
    );

    // Screen quad geometry
    const quadGeo = new THREE.PlaneGeometry(2, 2);

    this.forestMaterial = new THREE.ShaderMaterial({
      vertexShader: ForestWaterVertexShader,
      fragmentShader: ForestWaterFragmentShader,
      uniforms: {
        uForestTex: { value: forestTex },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uRipples: { value: this.ripples },
        uWaterLevel: { value: 0.415 },
      },
      depthWrite: false,
      depthTest: false,
    });

    this.quadMesh = new THREE.Mesh(quadGeo, this.forestMaterial);
    this.scene.add(this.quadMesh);
  }

  initParticles() {
    // Subtle morning sunlight motes drifting through light rays
    const particleCount = 35;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Clustered in middle-upper right where morning sunlight streams through
      positions[i * 3] = (Math.random() - 0.2) * 1.5;
      positions[i * 3 + 1] = (Math.random() - 0.15) * 1.3;
      positions[i * 3 + 2] = 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.012,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  spawnDroplet() {
    // Spawn droplet from upper foliage (UV coordinates: x ~ 0.30-0.85, y ~ 0.65-0.88)
    const uvX = 0.30 + Math.random() * 0.55;
    const uvY = 0.68 + Math.random() * 0.20;
    const targetWaterY = 0.32 + Math.random() * 0.10; // Land naturally in the pond

    this.fallingDroplets.push({
      uvX,
      uvY,
      targetWaterY,
      vy: 0.0,
      active: true,
    });
  }

  triggerRipple(uvX, uvY, amplitude = 0.75) {
    const currentTime = this.clock.getElapsedTime();
    this.ripples[this.rippleIndex].set(uvX, uvY, currentTime, amplitude);
    this.rippleIndex = (this.rippleIndex + 1) % 8;

    forestAudio.triggerDropletImpact();
    this.onRippleImpact({ x: uvX, y: uvY });
  }

  initEvents() {
    this.handlePointerMove = (e) => {
      this.targetMouse.x = e.clientX / window.innerWidth;
      this.targetMouse.y = 1.0 - e.clientY / window.innerHeight;
    };

    this.handleClick = (e) => {
      // Interactive water ripple on click if clicked in pond area
      const uvX = e.clientX / window.innerWidth;
      const uvY = 1.0 - e.clientY / window.innerHeight;
      if (uvY <= 0.44) {
        this.triggerRipple(uvX, uvY, 1.1);
      }
    };

    this.handleResize = () => {
      if (!this.canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setSize(w, h);
      if (this.forestMaterial) {
        this.forestMaterial.uniforms.uResolution.value.set(w, h);
      }
    };

    window.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('resize', this.handleResize);
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Smooth natural mouse parallax
    this.mouse.lerp(this.targetMouse, 0.025);

    // Update shader uniforms
    if (this.forestMaterial) {
      this.forestMaterial.uniforms.uTime.value = elapsedTime;
      this.forestMaterial.uniforms.uMouse.value.copy(this.mouse);
    }

    // Occasional falling dew droplets
    if (elapsedTime > this.nextDropTime) {
      this.spawnDroplet();
      this.nextDropTime = elapsedTime + 4.0 + Math.random() * 4.5;
    }

    // Update falling droplets
    for (let i = this.fallingDroplets.length - 1; i >= 0; i--) {
      const d = this.fallingDroplets[i];
      if (!d.active) continue;

      d.vy += 0.70 * delta; // Natural gentle gravity
      d.uvY -= d.vy * delta;

      // Check for water surface impact
      if (d.uvY <= d.targetWaterY) {
        d.active = false;
        this.triggerRipple(d.uvX, d.targetWaterY, 0.75);
        this.fallingDroplets.splice(i, 1);
      }
    }

    // Drifting sunlight motes
    if (this.particles) {
      const pos = this.particles.geometry.attributes.position.array;
      for (let p = 0; p < pos.length; p += 3) {
        pos[p] += Math.sin(elapsedTime * 0.3 + p) * 0.0002;
        pos[p + 1] += Math.cos(elapsedTime * 0.25 + p) * 0.00015;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}
