import React, { useRef, useState, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Check, X } from "lucide-react";

interface PhotoCropModalProps {
  imageSrc: string;
  onCancel: () => void;
  onApply: (croppedDataUrl: string) => void;
}

// A simple, dependency-free crop/zoom tool: drag to pan, slider (or scroll
// wheel) to zoom, fixed square crop frame, export at a fixed output size.
export default function PhotoCropModal({ imageSrc, onCancel, onApply }: PhotoCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);

  const FRAME_SIZE = 280; // on-screen crop frame, in px
  const OUTPUT_SIZE = 900; // exported image resolution

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      // Start zoomed so the shorter side just fills the frame.
      const minDim = Math.min(img.width, img.height);
      setZoom(FRAME_SIZE / minDim);
      setOffset({ x: 0, y: 0 });
      setImgLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, startOffset: { ...offset } };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset({ x: dragState.current.startOffset.x + dx, y: dragState.current.startOffset.y + dy });
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.08 : 0.92)));
  };

  const clampZoom = (z: number) => {
    if (!imgRef.current) return z;
    const minDim = Math.min(imgRef.current.width, imgRef.current.height);
    const minZoom = FRAME_SIZE / minDim / 2; // allow zooming out a bit past "fill"
    return Math.max(minZoom, Math.min(z, 6));
  };

  const handleApply = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Map on-screen frame coordinates to the source image's pixel space.
    const displayedW = img.width * zoom;
    const displayedH = img.height * zoom;
    const frameLeftOnImage = (displayedW / 2 - FRAME_SIZE / 2 - offset.x) / zoom;
    const frameTopOnImage = (displayedH / 2 - FRAME_SIZE / 2 - offset.y) / zoom;
    const frameSizeOnImage = FRAME_SIZE / zoom;

    ctx.drawImage(
      img,
      frameLeftOnImage, frameTopOnImage, frameSizeOnImage, frameSizeOnImage,
      0, 0, OUTPUT_SIZE, OUTPUT_SIZE
    );

    onApply(canvas.toDataURL("image/jpeg", 0.9));
  }, [zoom, offset, onApply]);

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#fdfcf7] rounded-lg shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-[#3b5249] text-white px-4 py-3 flex items-center justify-between">
          <span className="font-serif font-bold text-sm">Crop & Zoom Photo</span>
          <button onClick={onCancel} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div
            ref={containerRef}
            className="relative mx-auto overflow-hidden bg-[#1c1a18] rounded touch-none select-none cursor-move"
            style={{ width: FRAME_SIZE, height: FRAME_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
          >
            {imgLoaded && imgRef.current && (
              <img
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                className="absolute top-1/2 left-1/2 max-w-none pointer-events-none"
                style={{
                  width: imgRef.current.width * zoom,
                  height: imgRef.current.height * zoom,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
            )}
            {/* Crop frame border overlay */}
            <div className="absolute inset-0 border-2 border-white/80 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => clampZoom(z * 0.9))}
              className="p-1.5 rounded border border-[#c4beaf] hover:bg-[#eae5d9] cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5 text-[#3b5249]" />
            </button>
            <input
              type="range"
              min={0.1}
              max={6}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(clampZoom(Number(e.target.value)))}
              className="flex-1 accent-[#3b5249]"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => clampZoom(z * 1.1))}
              className="p-1.5 rounded border border-[#c4beaf] hover:bg-[#eae5d9] cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5 text-[#3b5249]" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!imgRef.current) return;
                const minDim = Math.min(imgRef.current.width, imgRef.current.height);
                setZoom(FRAME_SIZE / minDim);
                setOffset({ x: 0, y: 0 });
              }}
              title="Reset"
              className="p-1.5 rounded border border-[#c4beaf] hover:bg-[#eae5d9] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#3b5249]" />
            </button>
          </div>

          <p className="text-[10px] font-mono text-[#8e847a] text-center">
            Drag to reposition, scroll or use the slider to zoom
          </p>

          <div className="flex justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 text-xs font-mono font-bold uppercase bg-white border border-[#c4beaf] rounded hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 py-2 text-xs font-mono font-bold uppercase bg-[#3b5249] hover:bg-[#2c3d36] text-white rounded flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
