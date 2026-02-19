'use client';
import React, { useEffect, useRef } from 'react';

export default function NeuralBackground({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    
    let width = canvas.width = window.innerWidth; 
    let height = canvas.height = window.innerHeight;
    
    const particles: {x: number, y: number, vx: number, vy: number}[] = [];
    for (let i = 0; i < 60; i++) particles.push({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4 });
    
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; 
        if (p.x < 0 || p.x > width) p.vx *= -1; 
        if (p.y < 0 || p.y > height) p.vy *= -1;
        
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); 
        ctx.fillStyle = isDark ? 'rgba(139, 92, 246, 0.5)' : 'rgba(147, 51, 234, 0.6)'; ctx.fill();
        
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]; const dx = p.x - p2.x, dy = p.y - p2.y; const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 160) { ctx.beginPath(); ctx.strokeStyle = isDark ? `rgba(139, 92, 246, ${0.15 * (1 - dist/160)})` : `rgba(147, 51, 234, ${0.2 * (1 - dist/160)})`; ctx.lineWidth = 1.2; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
        }
      });
      requestAnimationFrame(animate);
    };
    
    const handleResize = () => { if (canvas) { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; } };
    window.addEventListener('resize', handleResize); animate(); return () => window.removeEventListener('resize', handleResize);
  }, [isDark]);
  
  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
};