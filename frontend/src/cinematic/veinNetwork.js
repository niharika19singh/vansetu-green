/**
 * Vein Network Generator & Morph Mapping for "Veins of Life".
 * Generates hierarchical organic leaf venation that topologically correlates
 * with Delhi's arterial network for seamless geometric morphing.
 */
import * as THREE from 'three';

export function generateVeinNetwork(delhiCorridors = []) {
  const veins = [];
  const morphPairs = [];

  // 1. Primary Midrib (Main stem through center of leaf)
  // Maps directly to the Central Delhi spine (Rajpath - Mathura Road - Ring Road)
  const midribPointsOrganic = [];
  const midribLength = 14;
  const numMidribSteps = 24;

  for (let i = 0; i < numMidribSteps; i++) {
    const frac = i / (numMidribSteps - 1);
    // Organic S-curve with natural leaf curvature
    const x = Math.sin(frac * Math.PI * 1.5) * 0.5 - 0.2;
    const y = Math.sin(frac * Math.PI) * 0.35; // raised vein rib
    const z = (frac - 0.5) * midribLength;
    midribPointsOrganic.push(new THREE.Vector3(x, y, z));
  }

  // 2. Secondary Lateral Veins (Branching off midrib at natural 45-60 degree angles)
  const numLateralPairs = 8;
  const lateralBranches = [];

  for (let i = 0; i < numLateralPairs; i++) {
    const tStem = 0.15 + (i / numLateralPairs) * 0.75;
    const stemIdx = Math.floor(tStem * (numMidribSteps - 1));
    const stemPoint = midribPointsOrganic[stemIdx];

    // Left branch
    const leftBranch = [];
    const rightBranch = [];
    const branchSteps = 12;
    const branchLength = 3.5 + Math.sin(tStem * Math.PI) * 2.5;

    for (let s = 0; s < branchSteps; s++) {
      const sFrac = s / (branchSteps - 1);
      // Organic curve arcing toward the leaf margin
      const lx = stemPoint.x - sFrac * branchLength * (0.8 + Math.sin(sFrac * 2.0) * 0.2);
      const lz = stemPoint.z + (sFrac * branchLength * 0.6) - Math.sin(sFrac * Math.PI * 0.5) * 0.5;
      const ly = stemPoint.y * (1.0 - sFrac * 0.7) + Math.sin(sFrac * Math.PI) * 0.1;
      leftBranch.push(new THREE.Vector3(lx, ly, lz));

      // Right branch (receives golden sunlight in Reference Image 1)
      const rx = stemPoint.x + sFrac * branchLength * (0.85 + Math.cos(sFrac * 2.0) * 0.15);
      const rz = stemPoint.z + (sFrac * branchLength * 0.55) - Math.sin(sFrac * Math.PI * 0.5) * 0.45;
      const ry = stemPoint.y * (1.0 - sFrac * 0.7) + Math.sin(sFrac * Math.PI) * 0.08;
      rightBranch.push(new THREE.Vector3(rx, ry, rz));
    }

    lateralBranches.push({ branch: leftBranch, side: 'left', id: `vein_L_${i}` });
    lateralBranches.push({ branch: rightBranch, side: 'right', id: `vein_R_${i}` });
  }

  // 3. Fine Tertiary Capillary Lines (dense reticulation network)
  const capillaries = [];
  const numCapillaries = 36;
  for (let c = 0; c < numCapillaries; c++) {
    const parentLat = lateralBranches[c % lateralBranches.length];
    const subIdx = 2 + Math.floor(Math.random() * 8);
    const startPt = parentLat.branch[subIdx] || parentLat.branch[0];
    const capPts = [startPt.clone()];

    const capSteps = 6;
    let curr = startPt.clone();
    for (let cs = 1; cs < capSteps; cs++) {
      const angle = (Math.random() - 0.5) * 1.5;
      const dirX = parentLat.side === 'left' ? -0.35 : 0.35;
      const dirZ = (Math.random() - 0.3) * 0.4;
      curr = new THREE.Vector3(
        curr.x + dirX + Math.sin(angle) * 0.15,
        Math.max(0.01, curr.y - 0.02),
        curr.z + dirZ
      );
      capPts.push(curr);
    }
    capillaries.push(capPts);
  }

  // 4. Build Morph Pairs between Organic Veins and Delhi Corridors
  // Primary midrib morphs to Delhi's main central arterial axis (Rajpath & Central ring)
  const targetCentralRoad = delhiCorridors[8] || delhiCorridors[0]; // Rajpath
  const targetPoints = targetCentralRoad?.points || midribPointsOrganic.map((p) => new THREE.Vector3(p.x * 2.0, 0, p.z * 1.8));

  // Resample points for uniform interpolation
  const midribCurve = new THREE.CatmullRomCurve3(midribPointsOrganic);
  const roadCurve = new THREE.CatmullRomCurve3(targetPoints);
  const numMorphSamples = 64;

  const organicSamples = midribCurve.getPoints(numMorphSamples);
  const urbanSamples = roadCurve.getPoints(numMorphSamples);

  morphPairs.push({
    name: 'Primary Arterial Spine',
    organic: organicSamples,
    urban: urbanSamples,
    weight: 1.0,
  });

  // Map lateral veins to Delhi radial corridors
  lateralBranches.forEach((lb, idx) => {
    const targetCorridor = delhiCorridors[idx % delhiCorridors.length];
    const lCurve = new THREE.CatmullRomCurve3(lb.branch);
    const lOrganicSamples = lCurve.getPoints(24);

    let lUrbanSamples;
    if (targetCorridor && targetCorridor.points.length >= 2) {
      const uCurve = new THREE.CatmullRomCurve3(targetCorridor.points);
      lUrbanSamples = uCurve.getPoints(24);
    } else {
      lUrbanSamples = lOrganicSamples.map((p) => new THREE.Vector3(p.x * 1.5, 0, p.z * 1.5));
    }

    morphPairs.push({
      name: lb.id,
      organic: lOrganicSamples,
      urban: lUrbanSamples,
      weight: 0.6,
    });
  });

  return {
    midribPoints: midribPointsOrganic,
    lateralBranches,
    capillaries,
    morphPairs,
  };
}
