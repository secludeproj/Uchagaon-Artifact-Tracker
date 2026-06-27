import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, X, RefreshCw, AlertTriangle, CheckCircle, Keyboard } from "lucide-react";
import { Artifact } from "../types";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifacts: Artifact[];
  onNavigate: (view: string, targetId?: string) => void;
}

export default function QRScannerModal({ isOpen, onClose, artifacts, onNavigate }: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasScannedRef = useRef<boolean>(false);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [scannedItem, setScannedItem] = useState<Artifact | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");

  // Synthesize scan beep
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitched clean chirp
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (err) {
      console.warn("Could not trigger audio context feedback", err);
    }
  };

  // Enumerate cameras
  const loadVideoDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((device) => device.kind === "videoinput");
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        // Prefer back camera if available by testing labels
        const backCamera = videoDevices.find((d) => 
          d.label.toLowerCase().includes("back") || 
          d.label.toLowerCase().includes("rear") || 
          d.label.toLowerCase().includes("environment")
        );
        setSelectedDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  };

  // Handle stream initialization
  const startCamera = async () => {
    // Clean up any existing streams/animations first
    stopCamera();

    const constraints: MediaStreamConstraints = {
      video: selectedDeviceId 
        ? { deviceId: { exact: selectedDeviceId } } 
        : { facingMode: "environment" }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // Prevent iOS from opening full-screen
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Autoplay was blocked or interrupted:", playErr);
        }
      }
      setHasPermission(true);
      setErrorMessage("");
      // Trigger camera list refresh since label is filled only post-authorization
      await loadVideoDevices();
    } catch (err: any) {
      console.error("Camera source access failed", err);
      setHasPermission(false);
      setErrorMessage(
        err.message || 
        "Unknown security exception. Please verify your browser has given permissions to access your camera device."
      );
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Periodic frame grab and scan loop
  const tick = () => {
    if (!videoRef.current || !canvasRef.current || hasScannedRef.current) {
      animationFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Wait until video has valid layout width
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const context = canvas.getContext("2d");
      if (context) {
        // Match the video dimensions exactly to maintain correct aspect ratio and prevent distortion
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to hidden processing canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Pull down pixels
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Push frame payload to jsQR parser
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });

        if (code) {
          const rawCodeValue = code.data.trim();
          handleScannedValue(rawCodeValue);
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  // Process a detected QR code string
  const handleScannedValue = (qrValue: string) => {
    if (!qrValue || hasScannedRef.current) return;

    hasScannedRef.current = true;

    // Look up items matching either qrCode directly, ID directly, or containing in substring
    const matched = artifacts.find(
      (item) =>
        item.qrCode.toLowerCase() === qrValue.toLowerCase() ||
        item.id.toLowerCase() === qrValue.toLowerCase() ||
        qrValue.toLowerCase().includes(item.id.toLowerCase()) ||
        qrValue.toLowerCase().includes(item.qrCode.toLowerCase())
    );

    playBeep();
    setScannedResult(qrValue);

    if (matched) {
      setScannedItem(matched);
      // Auto-navigate to Item Detail view after beautiful positive feedback transition
      setTimeout(() => {
        onClose();
        onNavigate("item-detail", matched.id);
      }, 1500);
    } else {
      setScannedItem(null);
    }
  };

  // Handle manually input codes
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError("");

    const term = manualCode.trim();
    if (!term) {
      setManualError("Please type a code to resume registrar query.");
      return;
    }

    const matched = artifacts.find(
      (item) =>
        item.qrCode.toLowerCase() === term.toLowerCase() ||
        item.id.toLowerCase() === term.toLowerCase() ||
        term.toLowerCase().includes(item.id.toLowerCase()) ||
        item.qrCode.toLowerCase().includes(term.toLowerCase())
    );

    if (matched) {
      hasScannedRef.current = true;
      playBeep();
      setScannedResult(term);
      setScannedItem(matched);
      setTimeout(() => {
        onClose();
        onNavigate("item-detail", matched.id);
      }, 1200);
    } else {
      setManualError(`No heritage artifact matching identifier "${term}" was found in the Seclude Hotel catalog.`);
    }
  };

  // Start/Stop cycle based on visibility props
  useEffect(() => {
    if (isOpen) {
      hasScannedRef.current = false;
      setScannedResult(null);
      setScannedItem(null);
      setShowManualInput(false);
      setManualCode("");
      setManualError("");
      
      startCamera();
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, selectedDeviceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed backdrop blur */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Central modal card */}
      <div className="relative bg-[#fdfcf7] border border-[#dcd6c8] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden z-10 font-sans">
        
        {/* Header Block with luxury gold/charcoal palette */}
        <div className="bg-[#1c1a18] p-4 text-white flex items-center justify-between border-b border-[#3e3835]">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#dfd6be]" />
            <span className="font-serif font-semibold text-sm tracking-wide text-[#f5efe4]">
              Heritage QR Scanner Companion
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-[#322f2b] rounded-full text-gray-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Scan Interface Screen */}
        <div className="p-5 space-y-4">
          
          {/* Main scanner panel */}
          {!scannedResult ? (
            <div className="space-y-4">
              {!showManualInput ? (
                <>
                  {/* Aspect-stabilized Viewfinder frame */}
                  <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-[#dcd6c8] shadow-inner flex items-center justify-center">
                    
                    {/* Live streaming Camera Video tag */}
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                      playsInline
                      muted
                    />

                    {/* Hidden Frame-Processing Canvas */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Viewfinder Target corners and laser sweep */}
                    {hasPermission && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {/* Scanning Box Outline */}
                        <div className="w-48 h-48 border-2 border-dashed border-[#dfd6be]/40 relative flex items-center justify-center">
                          
                          {/* Precise neon retro framing brackets */}
                          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl" />
                          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr" />
                          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br" />

                          {/* Pulsing scanning text */}
                          <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-400 uppercase bg-black/60 px-2 py-0.5 rounded animate-pulse">
                            Tracking Live
                          </span>
                        </div>

                        {/* Animated Laser sweeping grid */}
                        <div className="absolute left-1/2 -translate-x-1/2 w-48 h-1 bg-emerald-500/80 shadow-[0_0_10px_#10b981] animate-bounce top-[25%] bottom-[25%]" style={{ animationDuration: '2.5s' }} />
                      </div>
                    )}

                    {/* Camera Permission Pending State */}
                    {hasPermission === null && (
                      <div className="flex flex-col items-center gap-2 text-center p-6 text-[#8e847a]">
                        <RefreshCw className="w-8 h-8 animate-spin" />
                        <p className="text-xs font-mono">Initializing localized camera access request...</p>
                      </div>
                    )}

                    {/* Error / Permission Blocked visual state */}
                    {hasPermission === false && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#1c1a18]/95 text-center text-white space-y-3">
                        <AlertTriangle className="w-10 h-10 text-amber-500 animate-bounce" />
                        <div className="space-y-1">
                          <p className="font-serif font-semibold text-sm text-[#f5efe4]">Camera Authorization Denied</p>
                          <p className="text-[11px] text-[#b3a89b] max-w-xs mx-auto">
                            The browser was refused permission, or no active recording devices were discovered.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setHasPermission(null);
                            startCamera();
                          }}
                          className="px-3 py-1.5 bg-[#3b5249] hover:bg-[#2f423a] text-white text-xs font-semibold rounded shadow-md transition-all active:scale-95"
                        >
                          Retry Access Request
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Device and Mode Utilities */}
                  {hasPermission && (
                    <div className="flex items-center justify-between gap-2.5 pt-1">
                      {/* Device selector dropdown */}
                      <div className="flex-1 min-w-0">
                        {devices.length > 1 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold font-mono text-[#6e645a] uppercase whitespace-nowrap">Camera:</span>
                            <select
                              value={selectedDeviceId}
                              onChange={(e) => setSelectedDeviceId(e.target.value)}
                              className="text-xs bg-white border border-[#c8c2b5] rounded px-2 py-1 flex-1 min-w-0 text-[#1c1a18] focus:outline-none focus:border-[#3b5249]"
                            >
                              {devices.map((device, idx) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                  {device.label || `Camera ${idx + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-[#8e847a]">
                            Auto-tracking environment camera lens active.
                          </span>
                        )}
                      </div>

                      {/* Manual lookup toggle */}
                      <button
                        onClick={() => {
                          stopCamera();
                          setShowManualInput(true);
                        }}
                        className="text-xs text-[#3b5249] hover:text-[#1c1a18] font-bold flex items-center gap-1 shrink-0 px-2 py-1 rounded bg-[#eae5d9]/30 hover:bg-[#eae5d9]/60 border border-[#dcd6c8]/50 transition-all"
                      >
                        <Keyboard className="w-3.5 h-3.5" />
                        Type Code
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Manual lookup mode */
                <form onSubmit={handleManualSubmit} className="space-y-4 py-2">
                  <div className="bg-[#eae5d9]/40 border border-[#dcd6c8]/60 p-3 rounded-lg text-xs text-[#6e645a] leading-relaxed">
                    Provide the alpha-numeric artifact ID (e.g. <span className="font-mono bg-white px-1 py-0.5 border rounded">HER-002</span>) or QR code descriptor string printed on the physical display plaque.
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#6e645a]">
                      Plaster / Plaque Serial Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="e.g. SECLUDE-HER-009 or HER-009"
                        className="flex-1 px-3 py-2 bg-white border border-[#c8c2b5] rounded text-sm focus:outline-none focus:border-[#3b5249]"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#3b5249] hover:bg-[#2f423a] text-white text-xs font-bold uppercase tracking-wider rounded transition-all active:scale-95 shadow-sm"
                      >
                        Lookup
                      </button>
                    </div>
                    {manualError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-md mt-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {manualError}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualInput(false);
                        setManualCode("");
                        setManualError("");
                        startCamera();
                      }}
                      className="text-xs text-[#6e645a] hover:text-[#1c1a18] font-bold border-b border-[#6e645a]/50 hover:border-black transition-all"
                    >
                      Return to Camera Scanner mode
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Scanned Successfully Block */
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h4 className="font-serif font-bold text-base text-[#1c1a18]">
                  Asset Identified Successfully
                </h4>
                <p className="text-xs text-[#8e847a] font-mono">
                  Code Read: <span className="bg-[#eae5d9]/50 px-1.5 py-0.5 rounded font-bold">{scannedResult}</span>
                </p>
              </div>

              {scannedItem ? (
                <div className="w-full max-w-sm bg-white border border-emerald-100 rounded-lg p-3 pt-4 flex gap-3 text-left shadow-sm">
                  <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden shrink-0 border border-gray-200">
                    <img 
                      src={scannedItem.photos?.[0]} 
                      alt={scannedItem.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                      {scannedItem.id}
                    </span>
                    <h5 className="font-serif font-bold text-xs text-[#1c1a18] truncate mt-1">
                      {scannedItem.name}
                    </h5>
                    <p className="text-[10px] text-[#6e645a] truncate mt-0.5">
                      Location: {scannedItem.currentLocation}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-sm bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-[#846321] text-left">
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Unregistered QR Identifier Code
                  </p>
                  <p className="leading-relaxed">
                    This tag corresponds to code <span className="font-mono bg-white px-1 border rounded">{scannedResult}</span>, but isn't associated with any item currently indexed in the Seclude Hotel archive.
                  </p>
                  <div className="mt-3.5 flex justify-end">
                    <button
                      onClick={() => {
                        hasScannedRef.current = false;
                        setScannedResult(null);
                        setScannedItem(null);
                        if (!showManualInput) {
                          startCamera();
                        }
                      }}
                      className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold text-[10px] uppercase tracking-wide rounded transition-all shadow-sm"
                    >
                      Recalibrate Scanner
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Informative Help Guide footer */}
        <div className="bg-[#eae5d9]/40 border-t border-[#dcd6c8] p-3 text-[10px] text-[#6e645a] text-center flex justify-center items-center gap-1 font-mono">
          <span>Secure WebRTC Session. Powered by Client-Side jsQR Processing.</span>
        </div>

      </div>
    </div>
  );
}
