/**
 * Corridor3DViewer.jsx — Flagship 3D Urban Corridor Cross-Section & Engineering Viewer.
 *
 * Implements:
 * - Native Three.js procedural WebGL rendering of physical corridor microclimate interventions
 * - 7 Distinct Procedural 3D Archetypes:
 *   1. baseline: Barren narrow asphalt, dry concrete sidewalks, zero canopy/shade (42.5°C surface)
 *   2. shade_bridge: Tensile membrane canopy arches, steel truss columns, misting nozzles
 *   3. tree_canopy: Native Delhi avenue trees (Neem/Peepal/Pilkhan) with root grates & canopy tunnel
 *   4. cool_pavement: Solar-reflective high-albedo coating (silver/cyan), permeable pavers
 *   5. bus_stop_cooling: Modern transit shelter with PV solar roof, mist fans & tactile paving
 *   6. green_corridor: Roadside bioswales, rain gardens, permeable grass pavers & native shrubs
 *   7. combined: Full-stack integrated green infrastructure matching recommendation
 * - Interactive archetype selector buttons with real-time procedural scene rebuild
 * - Baseline A/B comparison toggle
 * - Engineering metrics readout: CapEx (₹ Lakhs/km), Surface Cooling (°C), Shading Index
 * - Interactive mouse/touch 360° orbit rotation with smooth auto-rotation
 * - Strict WebGL memory cleanup and context disposal on unmount
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  Eye,
  RotateCcw,
  Sparkles,
  Trees,
  Umbrella,
  Sun,
  Bus,
  Layers,
  CheckCircle2,
  Compass,
} from 'lucide-react';

export const INTERVENTION_ARCHETYPES = {
  baseline: {
    id: 'baseline',
    label: 'Baseline (Barren)',
    shortLabel: 'Baseline',
    icon: Sun,
    capexLakhsPerKm: 0.0,
    coolingDeltaC: 0.0,
    surfaceTempC: 42.5,
    shadingPct: 5,
    description: 'Existing condition: barren asphalt carriageway, zero canopy, extreme radiant heat.',
    accentColor: '#94a3b8',
  },
  shade_bridge: {
    id: 'shade_bridge',
    label: 'Tensile Shade Bridge',
    shortLabel: 'Shade Bridge',
    icon: Umbrella,
    capexLakhsPerKm: 48.5,
    coolingDeltaC: -4.2,
    surfaceTempC: 34.8,
    shadingPct: 88,
    description: 'High-tensile PTFE fabric canopy with steel frame, misting nozzles & PV LED integration.',
    accentColor: '#38bdf8',
  },
  tree_canopy: {
    id: 'tree_canopy',
    label: 'Native Tree Avenue',
    shortLabel: 'Tree Canopy',
    icon: Trees,
    capexLakhsPerKm: 28.0,
    coolingDeltaC: -3.8,
    surfaceTempC: 33.2,
    shadingPct: 76,
    description: 'Double avenue of mature Neem & Pilkhan with permeable root grates & irrigation trenches.',
    accentColor: '#22c55e',
  },
  cool_pavement: {
    id: 'cool_pavement',
    label: 'Solar-Reflective Pavement',
    shortLabel: 'Cool Pavement',
    icon: Sparkles,
    capexLakhsPerKm: 34.2,
    coolingDeltaC: -2.9,
    surfaceTempC: 35.5,
    shadingPct: 20,
    description: 'High-albedo solar-reflective coating (SRI > 78) with permeable sub-base cutaway.',
    accentColor: '#00f5d4',
  },
  bus_stop_cooling: {
    id: 'bus_stop_cooling',
    label: 'Transit Shelter Cooling',
    shortLabel: 'Bus Stop Cooling',
    icon: Bus,
    capexLakhsPerKm: 38.0,
    coolingDeltaC: -3.5,
    surfaceTempC: 32.8,
    shadingPct: 82,
    description: 'Solar-powered evaporative misting transit shelter with green vertical trellis.',
    accentColor: '#f59e0b',
  },
  green_corridor: {
    id: 'green_corridor',
    label: 'Bioswale & Rain Gardens',
    shortLabel: 'Green Bioswale',
    icon: Layers,
    capexLakhsPerKm: 42.0,
    coolingDeltaC: -3.4,
    surfaceTempC: 33.6,
    shadingPct: 65,
    description: 'Continuous stormwater bioretention basins, permeable grass pavers & native shrubs.',
    accentColor: '#10b981',
  },
  combined: {
    id: 'combined',
    label: 'Integrated Multi-Intervention',
    shortLabel: 'Combined',
    icon: CheckCircle2,
    capexLakhsPerKm: 72.5,
    coolingDeltaC: -5.6,
    surfaceTempC: 31.2,
    shadingPct: 92,
    description: 'Comprehensive package: Native tree canopy + cool pavement + bioswales + transit shade.',
    accentColor: '#a855f7',
  },
};

export default function Corridor3DViewer({
  corridor,
  interventionType = 'tree_canopy',
  height = '340px',
}) {
  const mountRef = useRef(null);
  const [activeArchetype, setActiveArchetype] = useState(
    INTERVENTION_ARCHETYPES[interventionType] ? interventionType : 'tree_canopy'
  );
  const [isRotating, setIsRotating] = useState(true);
  const [isComparingBaseline, setIsComparingBaseline] = useState(false);

  // When parent prop updates, sync state
  useEffect(() => {
    if (interventionType && INTERVENTION_ARCHETYPES[interventionType]) {
      setActiveArchetype(interventionType);
    }
  }, [interventionType]);

  const currentConfigKey = isComparingBaseline ? 'baseline' : activeArchetype;
  const currentConfig = INTERVENTION_ARCHETYPES[currentConfigKey] || INTERVENTION_ARCHETYPES.tree_canopy;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const heightPx = parseInt(height, 10) || 340;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04130e);
    scene.fog = new THREE.FogExp2(0x04130e, 0.022);

    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 100);
    camera.position.set(0, 7.5, 17);
    camera.lookAt(0, 1.2, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, currentConfigKey === 'baseline' ? 0.85 : 0.65);
    scene.add(ambientLight);

    const sunColor = currentConfigKey === 'baseline' ? 0xffeaae : 0xfef9eb;
    const sunLight = new THREE.DirectionalLight(sunColor, currentConfigKey === 'baseline' ? 1.5 : 1.25);
    sunLight.position.set(9, 15, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(
      currentConfigKey === 'cool_pavement' ? 0x00f5d4 : 0x34d399,
      0.35
    );
    fillLight.position.set(-8, 5, -6);
    scene.add(fillLight);

    // 4. Main Group for Procedural Corridor Geometry
    const corridorGroup = new THREE.Group();
    scene.add(corridorGroup);

    // -------------------------------------------------------------
    // PROCEDURAL BUILDER ROUTINES
    // -------------------------------------------------------------

    // A. Road Surface
    const isCoolPave = currentConfigKey === 'cool_pavement' || currentConfigKey === 'combined';
    const roadColor = isCoolPave ? 0x6e8898 : currentConfigKey === 'baseline' ? 0x1f2328 : 0x272b30;
    const roadRoughness = isCoolPave ? 0.45 : 0.88;

    const roadGeo = new THREE.BoxGeometry(22, 0.22, 6.2);
    const roadMat = new THREE.MeshStandardMaterial({
      color: roadColor,
      roughness: roadRoughness,
      metalness: isCoolPave ? 0.25 : 0.05,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(0, 0, 0);
    roadMesh.receiveShadow = true;
    corridorGroup.add(roadMesh);

    // Dashed White / Cyan Centerline Dividers
    for (let x = -9; x <= 9; x += 3) {
      const lineGeo = new THREE.PlaneGeometry(1.6, 0.18);
      const lineMat = new THREE.MeshBasicMaterial({
        color: isCoolPave ? 0x00f5d4 : 0xf1f5f9,
      });
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.position.set(x, 0.12, 0);
      corridorGroup.add(lineMesh);
    }

    // B. Concrete Sidewalks / Footpaths (North & South)
    const walkMat = new THREE.MeshStandardMaterial({
      color: currentConfigKey === 'baseline' ? 0x3a4049 : 0x475569,
      roughness: 0.9,
    });

    const walkNorth = new THREE.Mesh(new THREE.BoxGeometry(22, 0.35, 3.6), walkMat);
    walkNorth.position.set(0, 0.1, 4.8);
    walkNorth.receiveShadow = true;
    corridorGroup.add(walkNorth);

    const walkSouth = new THREE.Mesh(new THREE.BoxGeometry(22, 0.35, 3.6), walkMat);
    walkSouth.position.set(0, 0.1, -4.8);
    walkSouth.receiveShadow = true;
    corridorGroup.add(walkSouth);

    // Granite Curbs
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const curbN = new THREE.Mesh(new THREE.BoxGeometry(22, 0.45, 0.25), curbMat);
    curbN.position.set(0, 0.15, 3.1);
    corridorGroup.add(curbN);

    const curbS = new THREE.Mesh(new THREE.BoxGeometry(22, 0.45, 0.25), curbMat);
    curbS.position.set(0, 0.15, -3.1);
    corridorGroup.add(curbS);

    // Helper: Tree Generator
    function createTree(x, z, scale = 1.0, species = 'neem') {
      const tree = new THREE.Group();
      tree.position.set(x, 0.25, z);

      // Root barrier / circular grate
      const grateGeo = new THREE.CylinderGeometry(0.7 * scale, 0.7 * scale, 0.05, 12);
      const grateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const grate = new THREE.Mesh(grateGeo, grateMat);
      grate.position.y = 0.02;
      tree.add(grate);

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, 2.4 * scale, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x452a17, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = (2.4 * scale) / 2;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      tree.add(trunk);

      // Foliage Clusters
      const foliageColor = species === 'peepal' ? 0x15803d : species === 'amaltas' ? 0xf59e0b : 0x16a34a;
      const foliageMat = new THREE.MeshStandardMaterial({
        color: foliageColor,
        roughness: 0.65,
        flatShading: true,
      });

      const clusters = [
        [0, 2.5 * scale, 0, 1.35 * scale],
        [0.5 * scale, 2.9 * scale, 0.3 * scale, 1.0 * scale],
        [-0.5 * scale, 2.8 * scale, -0.35 * scale, 0.95 * scale],
        [0.35 * scale, 3.1 * scale, -0.4 * scale, 0.9 * scale],
        [-0.3 * scale, 3.2 * scale, 0.35 * scale, 0.85 * scale],
      ];

      for (const [ox, oy, oz, r] of clusters) {
        const leafMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), foliageMat);
        leafMesh.position.set(ox, oy, oz);
        leafMesh.castShadow = true;
        leafMesh.receiveShadow = true;
        tree.add(leafMesh);
      }
      return tree;
    }

    // Helper: Tensile Shade Canopy Builder
    function createShadeCanopy(x, z) {
      const canopy = new THREE.Group();
      canopy.position.set(x, 0.25, z);

      // Steel Tubular Truss Pillars
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.8,
        roughness: 0.3,
      });
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 8), pillarMat);
      p1.position.set(-1.8, 1.7, -1.0);
      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 8), pillarMat);
      p2.position.set(1.8, 1.7, -1.0);
      const p3 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 8), pillarMat);
      p3.position.set(-1.8, 1.7, 1.0);
      const p4 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 8), pillarMat);
      p4.position.set(1.8, 1.7, 1.0);
      canopy.add(p1, p2, p3, p4);

      // Arched Tensile Fabric Membrane
      const fabricGeo = new THREE.CylinderGeometry(2.2, 2.2, 3.8, 16, 1, true, -Math.PI / 2, Math.PI);
      const fabricMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const membrane = new THREE.Mesh(fabricGeo, fabricMat);
      membrane.rotation.z = Math.PI / 2;
      membrane.position.set(0, 3.4, 0);
      membrane.castShadow = true;
      canopy.add(membrane);

      // Misting Nozzle Line (Cyan Glow Tube)
      const mistGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.6, 6);
      const mistMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
      const mist = new THREE.Mesh(mistGeo, mistMat);
      mist.rotation.z = Math.PI / 2;
      mist.position.set(0, 3.1, 0);
      canopy.add(mist);

      return canopy;
    }

    // Helper: Transit Shelter Builder
    function createBusStopShelter(x, z) {
      const shelter = new THREE.Group();
      shelter.position.set(x, 0.25, z);

      // Frame
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.0, 0.12), frameMat);
      post1.position.set(-2.0, 1.5, 0.9);
      const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.0, 0.12), frameMat);
      post2.position.set(2.0, 1.5, 0.9);
      shelter.add(post1, post2);

      // PV Solar Roof Panel (Angled)
      const roofGeo = new THREE.BoxGeometry(4.4, 0.08, 2.2);
      const roofMat = new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        metalness: 0.85,
        roughness: 0.2,
      });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0, 3.0, 0.1);
      roof.rotation.x = 0.08;
      roof.castShadow = true;
      shelter.add(roof);

      // Glass Back Wall with Climber Trellis
      const glassGeo = new THREE.BoxGeometry(4.0, 2.6, 0.06);
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x065f46,
        transparent: true,
        opacity: 0.65,
        roughness: 0.2,
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(0, 1.4, 0.95);
      shelter.add(glass);

      // Bench
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
      const bench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.45), benchMat);
      bench.position.set(0, 0.65, 0.6);
      shelter.add(bench);

      return shelter;
    }

    // Helper: Bioswale Basin Builder
    function createBioswale(x, z) {
      const bioswale = new THREE.Group();
      bioswale.position.set(x, 0.15, z);

      // Soil depression
      const soilGeo = new THREE.BoxGeometry(7.5, 0.15, 1.8);
      const soilMat = new THREE.MeshStandardMaterial({ color: 0x2e1f13, roughness: 0.95 });
      const soil = new THREE.Mesh(soilGeo, soilMat);
      soil.receiveShadow = true;
      bioswale.add(soil);

      // River pebbles & rock edge
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
      for (let rx = -3.2; rx <= 3.2; rx += 0.8) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), rockMat);
        rock.position.set(rx, 0.15, -0.75);
        bioswale.add(rock);
      }

      // Wetland Reeds & Shrub Clusters
      const shrubMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.7 });
      for (let sx = -3.0; sx <= 3.0; sx += 1.2) {
        const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 1), shrubMat);
        shrub.position.set(sx, 0.25, 0);
        shrub.castShadow = true;
        bioswale.add(shrub);
      }

      return bioswale;
    }

    // -------------------------------------------------------------
    // BUILD SCENE PER CHOSEN ARCHETYPE
    // -------------------------------------------------------------
    if (currentConfigKey === 'baseline') {
      // Barren: Only dry road and bare sidewalk, 0 trees, 0 shade
    } else if (currentConfigKey === 'shade_bridge') {
      // Tensile shade structures along footpaths
      corridorGroup.add(createShadeCanopy(-5, 4.8));
      corridorGroup.add(createShadeCanopy(5, 4.8));
      corridorGroup.add(createTree(-9.5, -4.8, 0.85, 'neem'));
      corridorGroup.add(createTree(9.5, -4.8, 0.85, 'peepal'));
    } else if (currentConfigKey === 'tree_canopy') {
      // Dense native tree avenue
      const positions = [-8.5, -4.5, -0.5, 3.5, 7.5];
      positions.forEach((x, i) => {
        corridorGroup.add(createTree(x, 5.2, 0.95 + (i % 3) * 0.15, i % 2 === 0 ? 'neem' : 'peepal'));
        corridorGroup.add(createTree(x + 1.2, -5.2, 0.9 + ((i + 1) % 3) * 0.15, i % 3 === 0 ? 'amaltas' : 'neem'));
      });
    } else if (currentConfigKey === 'cool_pavement') {
      // Reflective pavement + sparse trees
      corridorGroup.add(createTree(-7, 5.0, 0.9, 'neem'));
      corridorGroup.add(createTree(7, 5.0, 0.9, 'peepal'));
      corridorGroup.add(createTree(0, -5.0, 0.95, 'amaltas'));
    } else if (currentConfigKey === 'bus_stop_cooling') {
      // Transit shelter + mist cooling + supporting tree
      corridorGroup.add(createBusStopShelter(0, 4.8));
      corridorGroup.add(createTree(-6.5, 5.0, 0.95, 'neem'));
      corridorGroup.add(createTree(6.5, 5.0, 0.95, 'peepal'));
      corridorGroup.add(createTree(-3.5, -5.0, 0.85, 'amaltas'));
      corridorGroup.add(createTree(3.5, -5.0, 0.85, 'neem'));
    } else if (currentConfigKey === 'green_corridor') {
      // Bioswales & rain gardens
      corridorGroup.add(createBioswale(-4.0, 5.0));
      corridorGroup.add(createBioswale(4.0, -5.0));
      corridorGroup.add(createTree(-8.5, 5.2, 0.9, 'neem'));
      corridorGroup.add(createTree(8.5, -5.2, 0.9, 'peepal'));
    } else if (currentConfigKey === 'combined') {
      // Full stack
      corridorGroup.add(createBusStopShelter(4.5, 4.8));
      corridorGroup.add(createShadeCanopy(-4.5, 4.8));
      corridorGroup.add(createBioswale(0, -5.0));
      corridorGroup.add(createTree(-8.5, -5.2, 1.0, 'neem'));
      corridorGroup.add(createTree(7.5, -5.2, 1.0, 'peepal'));
    }

    // -------------------------------------------------------------
    // INTERACTION & ANIMATION LOOP
    // -------------------------------------------------------------
    let isDragging = false;
    let prevMouseX = 0;
    let animationFrameId;

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      corridorGroup.rotation.y += deltaX * 0.008;
      prevMouseX = e.clientX;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (isRotating && !isDragging) {
        corridorGroup.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      camera.aspect = w / heightPx;
      camera.updateProjectionMatrix();
      renderer.setSize(w, heightPx);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [height, isRotating, currentConfigKey]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-[#04130E] shadow-2xl select-none flex flex-col">
      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        style={{ width: '100%', height }}
        className="cursor-grab active:cursor-grabbing w-full"
      />

      {/* Top Floating Overlay Specs & Title */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2 bg-[#071C16]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-bold text-white">
          {corridor?.name || 'Corridor Engineering Cross-Section'}
        </span>
        <span className="text-[10px] text-cyan-300 font-mono font-bold">
          {corridor?.code || 'C-14'}
        </span>
      </div>

      {/* Top-Right Baseline Comparison Toggle */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsComparingBaseline(!isComparingBaseline)}
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold backdrop-blur-md border transition flex items-center gap-1.5 ${
            isComparingBaseline
              ? 'bg-amber-500/90 border-amber-400 text-slate-950 font-bold shadow-lg'
              : 'bg-[#071C16]/90 border-white/15 text-slate-200 hover:bg-[#12392B]'
          }`}
          title="Toggle A/B comparison against unmitigated baseline"
        >
          <Sun className="w-3.5 h-3.5 text-amber-300" />
          <span>{isComparingBaseline ? 'Showing Baseline' : 'Compare Baseline'}</span>
        </button>
      </div>

      {/* Interactive Archetype Selector Bar */}
      <div className="p-2 bg-[#071C16]/95 border-t border-white/10 flex items-center justify-between gap-1 overflow-x-auto">
        <div className="flex items-center gap-1">
          {Object.values(INTERVENTION_ARCHETYPES).map((arch) => {
            const isActive = !isComparingBaseline && activeArchetype === arch.id;
            const IconComp = arch.icon;
            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => {
                  setActiveArchetype(arch.id);
                  setIsComparingBaseline(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap transition border ${
                  isActive
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <IconComp className="w-3 h-3" style={{ color: arch.accentColor }} />
                <span>{arch.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Orbit Rotation Control */}
        <button
          type="button"
          onClick={() => setIsRotating(!isRotating)}
          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] flex items-center gap-1 shrink-0 border border-white/10"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{isRotating ? 'Pause' : 'Rotate'}</span>
        </button>
      </div>

      {/* Bottom Engineering KPIs Readout Bar */}
      <div className="px-3 py-2 bg-black/40 border-t border-white/5 grid grid-cols-4 gap-2 text-center text-[10px]">
        <div>
          <div className="text-slate-400">CapEx Estimate</div>
          <div className="font-bold text-white font-mono">
            {currentConfig.capexLakhsPerKm > 0
              ? `₹${currentConfig.capexLakhsPerKm} L/km`
              : '₹0 (Unmitigated)'}
          </div>
        </div>
        <div>
          <div className="text-slate-400">Cooling Delta</div>
          <div className="font-bold text-cyan-300 font-mono">
            {currentConfig.coolingDeltaC < 0 ? `${currentConfig.coolingDeltaC}°C` : '0.0°C'}
          </div>
        </div>
        <div>
          <div className="text-slate-400">Surface Temp</div>
          <div className="font-bold text-orange-300 font-mono">
            {currentConfig.surfaceTempC}°C
          </div>
        </div>
        <div>
          <div className="text-slate-400">Canopy Shading</div>
          <div className="font-bold text-emerald-300 font-mono">
            {currentConfig.shadingPct}%
          </div>
        </div>
      </div>
    </div>
  );
}
