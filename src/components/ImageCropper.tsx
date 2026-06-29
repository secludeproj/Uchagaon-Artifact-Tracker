import React, { useState, useRef, useCallback, useEffect } from "react";
import { Check, X, ZoomIn, ZoomOut, Move } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageSrc, onCrop, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const SIZE = 240; // canvas size

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
      // Center image initially
      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      setScale(scale);
      setOffset({
        x: (SIZE - img.width * scale) / 2,
        y: (SIZE - img.height * scale) / 2,
      });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imgRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    // Draw image
    const img = imgRef.current;
    ctx.drawImage(img, offset.x, offset.y, img.width * scale, img.height * scale);
    ctx.restore();

    // Draw circle border
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#3b5249";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [scale, offset, imageLoaded]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
  };

  const handleCrop = () => {
    if (!canvasRef.current) return;
    const croppedDataUrl = canvasRef.current.toDataURL("image/png");
    onCrop(croppedDataUrl);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#fdfcf7] rounded-xl shadow-2xl border-2 border-[#d3cdc0] p-6 w-full max-w-sm">
        <div className="text-center mb-4">
          <h3 className="font-serif font-bold text-[#1c1a18] text-base">Adjust Profile Photo</h3>
          <p className="text-[11px] text-[#8e847a] font-mono mt-0.5">Drag to position · Zoom to fit</p>
        </div>

        {/* Canvas */}
        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="rounded-full cursor-move border-4 border-[#3b5249] shadow-lg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            style={{ touchAction: "none" }}
          />
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={() => setScale(s => Math.max(0.1, s - 0.1))}
            className="p-2 bg-[#eae5d9] hover:bg-[#d3cdc0] rounded cursor-pointer transition-all">
            <ZoomOut className="w-4 h-4 text-[#3b5249]" />
          </button>
          <input type="range" min="0.1" max="4" step="0.05"
            value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
            className="flex-1 accent-[#3b5249] cursor-pointer"
          />
          <button type="button" onClick={() => setScale(s => Math.min(4, s + 0.1))}
            className="p-2 bg-[#eae5d9] hover:bg-[#d3cdc0] rounded cursor-pointer transition-all">
            <ZoomIn className="w-4 h-4 text-[#3b5249]" />
          </button>
        </div>

        <p className="text-[10px] text-center text-[#8e847a] font-mono mb-4 flex items-center justify-center gap-1">
          <Move className="w-3 h-3" /> Drag the image to reposition
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 border border-[#c8c2b5] text-[#5c544d] rounded font-mono text-xs font-bold hover:bg-[#f5f2eb] transition-all cursor-pointer flex items-center justify-center gap-1.5">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button type="button" onClick={handleCrop}
            className="flex-1 py-2.5 bg-[#3b5249] hover:bg-[#2c3d36] text-white rounded font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Use This Photo
          </button>
        </div>
      </div>
    </div>
  );
}
