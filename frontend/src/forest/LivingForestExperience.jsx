/**
 * LivingForestExperience.jsx — Layer 1 Photorealistic Living Forest & Tidal Water Canvas.
 * Mounts the LivingForestDirector Three.js engine and renders continuous water wave
 * displacement, droplet ripples, and subtle sunlight motes behind the functional UI.
 */
import React, { useEffect, useRef, useState } from 'react';
import { LivingForestDirector } from './LivingForestDirector';

const REMOTE_BG = 'https://i.pinimg.com/1200x/f3/2d/44/f32d449cc721be356efb6dad47834669.jpg';
const LOCAL_BG = '/textures/landing_forest_background.jpg';

export default function LivingForestExperience({
  onRipple,
  interactiveWater = true,
}) {
  const canvasRef = useRef(null);
  const directorRef = useRef(null);
  const [bgSrc, setBgSrc] = useState(REMOTE_BG);

  useEffect(() => {
    if (!canvasRef.current) return;

    const director = new LivingForestDirector(canvasRef.current, {
      onRippleImpact: (pos) => {
        if (onRipple) onRipple(pos);
      },
    });

    directorRef.current = director;

    return () => {
      director.destroy();
      directorRef.current = null;
    };
  }, [onRipple]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden -z-20 pointer-events-none select-none">
      {/* Required Landing Page Background Asset with Local Fallback */}
      <img
        src={bgSrc}
        onError={() => setBgSrc(LOCAL_BG)}
        alt="Living Forest and Water Background"
        className="absolute inset-0 w-full h-full object-cover -z-30 opacity-90 transition-opacity duration-1000"
      />

      {/* WebGL 3D Water & Forest Shader Canvas */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${
          interactiveWater ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
