import { useState, useRef } from 'react';

export default function SlideToConfirm({ onConfirm, label = 'Slide to confirm' }) {
  const [slid, setSlid] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const containerRef = useRef(null);

  const handleStart = (clientX) => {
    setDragging(true);
    setStartX(clientX);
    setCurrentX(clientX);
    setSlid(false);
  };

  const handleMove = (clientX) => {
    if (!dragging) return;
    setCurrentX(clientX);
  };

  const handleEnd = () => {
    if (!dragging) return;
    const delta = currentX - startX;
    const threshold = (containerRef.current?.offsetWidth || 200) * 0.6;
    if (delta >= threshold) {
      setSlid(true);
      onConfirm();
    }
    setDragging(false);
    setCurrentX(0);
  };

  const progress = dragging
    ? Math.min(Math.max((currentX - startX) / ((containerRef.current?.offsetWidth || 200) * 0.6), 0), 1)
    : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-12 bg-green-500 rounded-lg overflow-hidden select-none"
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      <div
        className="absolute inset-0 bg-green-600 transition-all duration-75"
        style={{ width: `${progress * 100}%` }}
      />
      <div
        className="absolute top-0 left-0 h-full flex items-center justify-center bg-white/30 rounded-lg transition-all duration-75"
        style={{
          width: '48px',
          transform: dragging ? `translateX(${currentX - startX}px)` : 'translateX(0)',
        }}
      >
        <span className="text-white font-bold text-lg">→</span>
      </div>
      <span className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
        {slid ? 'Confirmed ✓' : label}
      </span>
    </div>
  );
}