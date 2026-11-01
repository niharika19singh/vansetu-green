/**
 * LivingForestDirector.js — Three.js Scene Engine for The Living Forest.
 * Manages the photorealistic forest backdrop, aspect-correct cover UV mapping,
 * continuous fluid water surface, perspective-correct ripples, and performance optimizations.
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

    this.isPaused = false;
    this.isVisible = true;
    this.prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    // Renderer Performance Optimizations (Improvement 4):
    // 1. antialias: false (fullscreen 2D quad needs zero polygon edge multisampling)
    // 2. Cap DPR at 1.5 for decorative hero canvas to slash fill-rate on Retina displays
    // 3. Removed dead ACES tone mapping overhead for custom unlit shader
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    // Load Forest Reference Texture
    this.textureLoader = new THREE.TextureLoader();
    this.initForestScene();
    this.initParticles();
    this.initEvents();
    this.initVisibilityObserver();

    this.animate = this.animate.bind(this);

    // If user prefers reduced motion, render a single still frame and halt loop
    if (this.prefersReducedMotion) {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  }

  getFocalPoint() {
    const isMobile = (window.innerWidth || 1920) <= 768;
    // Focal point (x: 0.38 centers leaves & droplets on mobile; 0.44 on desktop; y: 0.45 preserves waterline)
    return new THREE.Vector2(isMobile ? 0.38 : 0.44, 0.45);
  }

  getCoverCoord(screenX, screenY) {
    const w = window.innerWidth || 1920;
    const h = window.innerHeight || 1080;
    const screenAspect = w / Math.max(h, 1);
    const texAspect = 1024 / 573;
    const focal = this.getFocalPoint();

    let scaleX = 1.0;
    let scaleY = 1.0;
    if (screenAspect > texAspect) {
      scaleY = texAspect / screenAspect;
    } else {
      scaleX = screenAspect / texAspect;
    }

    const coverX = (screenX - focal.x) * scaleX + focal.x;
    const coverY = (screenY - focal.y) * scaleY + focal.y;
    return { x: coverX, y: coverY };
  }

  initForestScene() {
    const forestTex = this.textureLoader.load(
      '/textures/forest_reference.jpg',
      (tex) => {
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        if (this.prefersReducedMotion) {
          this.renderer.render(this.scene, this.camera);
        }
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
        uTexResolution: { value: new THREE.Vector2(1024, 573) },
        uFocalPoint: { value: this.getFocalPoint() },
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
    // Morning sunlight motes drifting through light rays
    const particleCount = 28;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.2) * 1.5;
      positions[i * 3 + 1] = (Math.random() - 0.15) * 1.3;
      positions[i * 3 + 2] = 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.011,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  spawnDroplet() {
    // Spawn droplet in photograph UV space
    const uvX = 0.32 + Math.random() * 0.48;
    const uvY = 0.65 + Math.random() * 0.22;
    const targetWaterY = 0.32 + Math.random() * 0.09; // Confined strictly to reflective pond

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

  initVisibilityObserver() {
    // Performance Optimization: Pause rendering loop when canvas is outside viewport
    if (typeof IntersectionObserver !== 'undefined' && this.canvas) {
      this.observer = new IntersectionObserver(
        ([entry]) => {
          const wasVisible = this.isVisible;
          this.isVisible = entry.isIntersecting;

          if (this.isVisible && !wasVisible && !this.prefersReducedMotion) {
            // Resume smoothly without time jump
            this.clock.getDelta(); // flush accumulated time
            if (!this.animationFrameId) {
              this.animationFrameId = requestAnimationFrame(this.animate);
            }
          } else if (!this.isVisible && this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
          }
        },
        { threshold: 0.05 }
      );
      this.observer.observe(this.canvas);
    }
  }

  initEvents() {
    this.handlePointerMove = (e) => {
      this.targetMouse.x = e.clientX / window.innerWidth;
      this.targetMouse.y = 1.0 - e.clientY / window.innerHeight;
    };

    this.handleClick = (e) => {
      // Interactive water ripple on click
      const screenX = e.clientX / window.innerWidth;
      const screenY = 1.0 - e.clientY / window.innerHeight;
      const { x, y } = this.getCoverCoord(screenX, screenY);

      // Trigger ripple if click lands in water region
      if (y <= 0.44) {
        this.triggerRipple(x, y, 1.05);
      }
    };

    this.handleResize = () => {
      if (!this.canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      if (this.forestMaterial) {
        this.forestMaterial.uniforms.uResolution.value.set(w, h);
        this.forestMaterial.uniforms.uFocalPoint.value.copy(this.getFocalPoint());
      }
      if (this.prefersReducedMotion) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('resize', this.handleResize);
  }

  animate() {
    if (!this.isVisible || this.prefersReducedMotion) {
      this.animationFrameId = null;
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1); // clamp delta against hitching
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
      this.nextDropTime = elapsedTime + 4.5 + Math.random() * 4.0;
    }

    // Update falling droplets
    for (let i = this.fallingDroplets.length - 1; i >= 0; i--) {
      const d = this.fallingDroplets[i];
      if (!d.active) continue;

      d.vy += 0.65 * delta; // Natural gentle gravity
      d.uvY -= d.vy * delta;

      // Check for water surface impact
      if (d.uvY <= d.targetWaterY) {
        d.active = false;
        this.triggerRipple(d.uvX, d.targetWaterY, 0.70);
        this.fallingDroplets.splice(i, 1);
      }
    }

    // Drifting sunlight motes
    if (this.particles) {
      const pos = this.particles.geometry.attributes.position.array;
      for (let p = 0; p < pos.length; p += 3) {
        pos[p] += Math.sin(elapsedTime * 0.28 + p) * 0.00018;
        pos[p + 1] += Math.cos(elapsedTime * 0.22 + p) * 0.00012;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.observer) {
      this.observer.disconnect();
    }
    window.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}
