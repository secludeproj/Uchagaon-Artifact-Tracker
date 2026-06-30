import React from "react";

interface SecludeLogoProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: "full" | "mark";
}

// Self-hosted SVG recreation of the Seclude Hotels tree-swirl logo
// (seclude.in blocks hotlinking to their PNG, so we render our own vector version)
export default function SecludeLogo({ className, style, variant = "full" }: SecludeLogoProps) {
  if (variant === "mark") {
    return (
      <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
        <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
          <path d="M50 90 C50 70, 50 55, 50 40" />
          <path d="M50 55 C40 50, 32 42, 35 32 C38 24, 48 24, 50 32 C52 24, 62 24, 65 32 C68 42, 60 50, 50 55" />
          <circle cx="35" cy="32" r="4" />
          <circle cx="65" cy="32" r="4" />
          <path d="M50 40 C45 35, 42 28, 46 22 C49 18, 54 18, 56 22 C58 28, 55 35, 50 40" />
          <circle cx="50" cy="20" r="3.5" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 90" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M40 82 C40 65, 40 52, 40 40" />
        <path d="M40 52 C32 48, 26 41, 28 33 C30 27, 38 27, 40 33 C42 27, 50 27, 52 33 C54 41, 48 48, 40 52" />
        <circle cx="28" cy="33" r="3.2" />
        <circle cx="52" cy="33" r="3.2" />
        <path d="M40 40 C36 36, 33 30, 37 25 C39 22, 43 22, 45 25 C47 30, 44 36, 40 40" />
        <circle cx="40" cy="23" r="2.8" />
      </g>
      <text x="72" y="56" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="600" fontSize="34" fill="currentColor">
        seclude
      </text>
      <text x="74" y="72" fontFamily="Arial, sans-serif" fontSize="9" letterSpacing="2" fill="currentColor" opacity="0.75">
        HOTELS HOME STYLE
      </text>
    </svg>
  );
}
