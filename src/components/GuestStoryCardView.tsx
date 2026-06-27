import React, { useEffect, useState } from "react";
import { Artifact } from "../types";
import { Compass, Sparkles, BookOpen } from "lucide-react";

interface GuestStoryCardViewProps {
  itemId: string;
}

export default function GuestStoryCardView({ itemId }: GuestStoryCardViewProps) {
  const [item, setItem] = useState<Artifact | null>(null);
  const [storyText, setStoryText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    async function loadStory() {
      try {
        setLoading(true);
        const res = await fetch(`/api/story/${itemId}`);
        if (!res.ok) {
          throw new Error(`Item ${itemId} not found`);
        }
        const data = await res.json();
        setItem(data.item);
        setStoryText(data.story);
      } catch (err: any) {
        console.error("Failed to load visitor story card:", err);
        setErrorCode(err.message || "Unable to retrieve heritage files.");
      } finally {
        setLoading(false);
      }
    }
    loadStory();
  }, [itemId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#140e0b] text-[#f4ebdf] flex flex-col items-center justify-center p-6 space-y-4">
        {/* Soft, rotating majestic load logo */}
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-[#dfb06c] animate-spin" />
        <p className="text-xs font-serif italic tracking-wide text-gray-400">
          Entering Palace Archival Records... Please wait...
        </p>
      </div>
    );
  }

  if (errorCode || !item) {
    return (
      <div className="min-h-screen bg-[#140e0b] text-[#f4ebdf] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 bg-red-950/40 border border-red-900 rounded-lg max-w-md">
          <h4 className="font-serif text-sm font-bold text-red-100">Exhibition Label Temporarily Off-Display</h4>
          <p className="text-xs text-red-200 mt-2 leading-relaxed">
            Please notify hotel concierge or wait while our digital heritage catalog restarts.
          </p>
        </div>
        <button 
          onClick={() => window.location.replace(window.location.origin)} 
          className="px-4 py-1.5 bg-[#4c1c1c] border border-[#6b2828] text-[#f4ebdf] font-mono text-xs font-bold rounded hover:bg-[#5e2222] transition-colors cursor-pointer"
        >
          Return to Portal
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#140e0b] text-[#fdfcf7] flex flex-col justify-between select-none">
      
      {/* 1. Header (Ethereal Luxury Hotel Brand Bar) */}
      <header className="bg-[#1c1410] border-b border-[#2d2019] py-4 text-center px-4 box-border">
        <span className="text-[10px] uppercase tracking-[0.25em] text-[#dfb06c] font-serif leading-none block font-bold">
          SECLUDE PALACE HOTEL
        </span>
        <span className="text-[8px] uppercase tracking-[0.3em] text-[#8c7b6c] font-mono leading-none block mt-1.5">
          UDAIPUR ROYAL HERITAGE REGISTRY
        </span>
      </header>

      {/* 2. Main Narrative Story Card Stage */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-5 py-8 space-y-6">
        
        {/* Gallery Showcase Card Frame */}
        <div className="relative border border-[#2d2019] bg-[#1a120e] p-2.5 rounded-lg shadow-2xl">
          <div className="aspect-[4/3] w-full overflow-hidden rounded bg-[#130d09] relative border border-[#2d2019]">
            <img 
              src={item.photos?.[0] || "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600"} 
              alt={item.name} 
              className="w-full h-full object-cover transition-all duration-700 hover:scale-105" 
              referrerPolicy="no-referrer"
            />
            {/* Minimal overlay status badge */}
            <div className="absolute top-2.5 left-2.5 bg-[#140e0b]/80 border border-[#dfb06c]/30 text-[#dfb06c] text-[8px] font-mono px-2 py-0.5 rounded tracking-wide uppercase">
              {item.category}
            </div>
          </div>
        </div>

        {/* Story Text Metadata Block */}
        <div className="space-y-4 text-center">
          {/* Artifact Name in Classic Serif Header */}
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-[#dfb06c] leading-tight">
            {item.name}
          </h2>

          {/* Golden Royal Divider flourish */}
          <div className="flex items-center justify-center gap-3 py-1">
            <div className="h-px bg-gradient-to-r from-transparent via-[#dfb06c]/45 to-transparent w-20" />
            <Sparkles className="w-3.5 h-3.5 text-[#dfb06c]/75 animate-pulse" />
            <div className="h-px bg-gradient-to-r from-transparent via-[#dfb06c]/45 to-transparent w-20" />
          </div>

          {/* Quick specs pill row */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono text-[#8c7b6c]">
            <span className="px-2 py-1 bg-[#1c1410] rounded border border-[#2d2019]">
              Era: <span className="text-[#dfb06c] font-bold">{item.estimatedAge}</span>
            </span>
            <span className="px-2 py-1 bg-[#1c1410] rounded border border-[#2d2019]">
              Composition: <span className="text-[#dfb06c] font-bold">{item.material}</span>
            </span>
            <span className="px-2 py-1 bg-[#1c1410] rounded border border-[#2d2019]">
              Scale: <span className="text-[#dfb06c] font-bold">{item.dimensions}</span>
            </span>
          </div>
        </div>

        {/* The Poetic Story Context Section (Gemini output) */}
        <div className="border border-[#2d2019] bg-gradient-to-b from-[#1a120e] to-[#140e0b] p-6 rounded-lg shadow-xl relative overflow-hidden">
          {/* Subtle watermark background decorative element */}
          <div className="absolute -right-6 -bottom-6 text-[#2d2019]/25 pointer-events-none select-none">
            <BookOpen className="w-24 h-24" />
          </div>

          <div className="relative space-y-4 z-10">
            <div className="text-center">
              <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-[#dfb06c] uppercase block">
                ✦ PALACE HISTORIAN CHRONICLE ✦
              </span>
            </div>

            {/* Split generated paragraphs by newlines and print them cleanly */}
            <div className="space-y-3.5 font-serif text-xs sm:text-sm text-gray-300 leading-relaxed text-justify indent-4">
              {storyText.split("\n\n").map((para, pIdx) => {
                if (!para.trim()) return null;
                return (
                  <p key={pIdx} className="first-letter:text-[#dfb06c] first-letter:text-lg first-letter:font-bold">
                    {para.trim()}
                  </p>
                );
              })}
            </div>
          </div>
        </div>

      </main>

      {/* 3. Infinite Signature Footer (Visually polished) */}
      <footer className="bg-[#120a07] border-t border-[#1f140f] py-4 text-center px-4">
        <p className="text-[9px] font-mono text-[#736357] leading-relaxed max-w-md mx-auto">
          Guests of Seclude Hotels Udaipur are invited to experience these masterworks live in their designated alcoves. Please respect physical boundaries.
        </p>
        <p className="text-[8px] font-mono text-[#dfb06c]/40 mt-1 uppercase tracking-wider">
          © {new Date().getFullYear()} Seclude Hotels Group • Hand-Carvings Conservation Lease
        </p>
      </footer>

    </div>
  );
}
