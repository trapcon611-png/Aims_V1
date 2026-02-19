'use client';
import React, { useEffect, useRef } from 'react';

const DirectorBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    
    let width = canvas.width = window.innerWidth; 
    let height = canvas.height = window.innerHeight;
    
    const particles: {x: number, y: number, vx: number, vy: number, alpha: number}[] = [];
    for (let i = 0; i < 50; i++) particles.push({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, alpha: Math.random() });
    
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; 
        if (p.x < 0 || p.x > width) p.vx *= -1; 
        if (p.y < 0 || p.y > height) p.vy *= -1;
        
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); 
        ctx.fillStyle = `rgba(220, 38, 38, ${p.alpha})`; 
        ctx.fill();
        
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]; 
          const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 180) { 
            ctx.beginPath(); 
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.15 * (1 - dist/180)})`; 
            ctx.lineWidth = 1; 
            ctx.moveTo(p.x, p.y); 
            ctx.lineTo(p2.x, p2.y); 
            ctx.stroke(); 
          }
        }
      });
      requestAnimationFrame(animate);
    };
    
    const handleResize = () => { if(canvas) { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; } };
    window.addEventListener('resize', handleResize); animate(); return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80 z-0" />;
};

export default DirectorBackground;