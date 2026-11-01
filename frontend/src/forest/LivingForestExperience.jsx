/**
 * LivingForestExperience.jsx — Layer 1 Photorealistic Living Forest & Tidal Water Canvas.
 * Mounts the LivingForestDirector Three.js engine and renders continuous water wave
 * displacement, droplet ripples, and subtle sunlight motes behind the functional UI.
 */
import React, { useEffect, useRef } from 'react';
import { LivingForestDirector } from './LivingForestDirector';

export default function LivingForestExperience({
  onRipple,
  interactiveWater = true,
}) {
  const canvasRef = useRef(null);
  const directorRef = useRef(null);

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
      {/* Fallback authentic reference photo on initial mount */}
      <img
        src="/textures/forest_reference.jpg"
        alt="Living Forest and Pond"
        className="absolute inset-0 w-full h-full object-cover -z-30 opacity-90 transition-opacity duration-1000"
        style={{ objectPosition: '40% 55%' }}
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
