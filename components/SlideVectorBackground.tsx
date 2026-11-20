import React from 'react';
import { SlideTemplate } from '../lib/slideTemplates';

interface SlideVectorBackgroundProps {
  template: SlideTemplate;
  variant: 'title' | 'content';
  className?: string;
}

/**
 * Pure, blank, text-free 16:9 vector background layer (viewBox 0 0 1333 750, 100 units = 1 inch).
 * Zero baked-in text, zero placeholder photos, zero watermarks.
 * Dynamically bound to the resolved SlideTemplate color palette tokens.
 */
export const SlideVectorBackground: React.FC<SlideVectorBackgroundProps> = ({
  template,
  variant,
  className = '',
}) => {
  const kind = template.vectorKind;
  if (!kind) return null;

  const { bg, surface, titleBg, heading, accent, border } = template.colors;
  const accentSoft = template.colors.accentSoft || surface;

  return (
    <svg
      viewBox="0 0 1333 750"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-vector-slide-bg={kind}
      data-vector-variant={variant}
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
    >
      {kind === 'diagonal-slash' && (
        <>
          <rect x="0" y="0" width="1333" height="750" fill={bg} />
          {/* Stripe 1: thin leading diagonal slash */}
          <polygon points="35,0 75,0 0,320 0,200" fill={accent} />
          {/* Stripe 2: bold primary diagonal slash */}
          <polygon points="115,0 215,0 65,750 0,750" fill={accent} />
          {/* Subtle 1px outer frame */}
          <rect x="1" y="1" width="1331" height="748" fill="none" stroke={accent} strokeWidth="2" />
        </>
      )}

      {kind === 'warm-geometric-arcs' &&
        (variant === 'title' ? (
          <>
            <rect x="0" y="0" width="1333" height="750" fill={bg} />
            {/* Left vertical tan panel */}
            <rect x="0" y="0" width="310" height="750" fill={accentSoft} />
            {/* Soft overlapping cream circle */}
            <circle cx="360" cy="120" r="200" fill={surface} />
            {/* 4 concentric quarter-circle arcs at top-right */}
            <circle cx="1333" cy="0" r="170" fill="none" stroke={accent} strokeWidth="1.4" opacity="0.55" />
            <circle cx="1333" cy="0" r="220" fill="none" stroke={accent} strokeWidth="1.4" opacity="0.45" />
            <circle cx="1333" cy="0" r="270" fill="none" stroke={accent} strokeWidth="1.4" opacity="0.35" />
            <circle cx="1333" cy="0" r="320" fill="none" stroke={accent} strokeWidth="1.4" opacity="0.25" />
            {/* Concentric quarter-circle arcs at bottom-center */}
            <circle cx="670" cy="750" r="130" fill="none" stroke={accent} strokeWidth="1.4" opacity="0.4" />
            <circle cx="670" cy="750" r="175" fill="none" stroke={accent} strokeWidth="1.4" opacity="0.28" />
            {/* 3 stacked stepped L-squares in bottom-right */}
            <rect x="1153" y="610" width="60" height="60" fill={accentSoft} />
            <rect x="1213" y="610" width="60" height="60" fill={accent} opacity="0.85" />
            <rect x="1213" y="670" width="60" height="60" fill={accentSoft} />
            <rect x="1273" y="670" width="60" height="60" fill={accent} />
          </>
        ) : (
          <>
            <rect x="0" y="0" width="1333" height="750" fill={bg} />
            {/* Narrow vertical side tabs on left/right mid-edges */}
            <rect x="0" y="255" width="35" height="240" fill={accentSoft} />
            <rect x="1298" y="255" width="35" height="240" fill={accentSoft} />
            {/* Delicate concentric arcs at top-right and bottom-left */}
            <circle cx="1333" cy="0" r="130" fill="none" stroke={accent} strokeWidth="1.3" opacity="0.45" />
            <circle cx="1333" cy="0" r="175" fill="none" stroke={accent} strokeWidth="1.3" opacity="0.3" />
            <circle cx="0" cy="750" r="130" fill="none" stroke={accent} strokeWidth="1.3" opacity="0.45" />
            <circle cx="0" cy="750" r="175" fill="none" stroke={accent} strokeWidth="1.3" opacity="0.3" />
            {/* Tiny stepped L-corner marks at top-left and bottom-right */}
            <rect x="30" y="30" width="22" height="22" fill={accent} opacity="0.85" />
            <rect x="52" y="30" width="22" height="22" fill={accentSoft} />
            <rect x="30" y="52" width="22" height="22" fill={accentSoft} />
            <rect x="1259" y="698" width="22" height="22" fill={accentSoft} />
            <rect x="1281" y="676" width="22" height="22" fill={accentSoft} />
            <rect x="1281" y="698" width="22" height="22" fill={accent} opacity="0.85" />
          </>
        ))}

      {kind === 'swiss-monochrome' &&
        (variant === 'title' ? (
          <>
            <rect x="0" y="0" width="1333" height="750" fill={bg} />
            {/* Solid accent anchor square top-left */}
            <rect x="70" y="50" width="65" height="65" fill={accent} />
            {/* Thin horizontal header rule */}
            <line x1="155" y1="82" x2="1263" y2="82" stroke={border} strokeWidth="1.5" />
            {/* Crisp centered outer title frame */}
            <rect x="220" y="180" width="890" height="380" fill="none" stroke={heading} strokeWidth="2" />
            {/* Bottom subtle hairline rule */}
            <line x1="70" y1="680" x2="1263" y2="680" stroke={border} strokeWidth="1.5" />
          </>
        ) : (
          <>
            <rect x="0" y="0" width="1333" height="750" fill={bg} />
            {/* Tiny top-left accent indicator square */}
            <rect x="70" y="42" width="24" height="24" fill={accent} />
            {/* Crisp 1px top divider line at y=85 */}
            <line x1="70" y1="85" x2="1263" y2="85" stroke={border} strokeWidth="1.5" />
            {/* Solid dark accent horizontal index bar at bottom */}
            <rect x="70" y="688" width="1193" height="32" fill={accent} opacity="0.92" />
          </>
        ))}

      {kind === 'corporate-slant' &&
        (variant === 'title' ? (
          <>
            <rect x="0" y="0" width="1333" height="750" fill={bg} />
            {/* Two soft translucent circular accents */}
            <circle cx="170" cy="110" r="145" fill={accentSoft} opacity="0.45" />
            <circle cx="670" cy="690" r="155" fill={accentSoft} opacity="0.45" />
            {/* Large smooth angled polygon covering right ~34% */}
            <path
              d="M 945 0 L 1333 0 L 1333 750 L 850 750 C 835 750 828 738 833 722 L 925 22 C 929 8 936 0 945 0 Z"
              fill={accent}
            />
          </>
        ) : (
          <>
            <rect x="0" y="0" width="1333" height="750" fill={bg} />
            {/* Thin top-right rounded accent bar */}
            <rect x="813" y="34" width="450" height="14" rx="7" fill={accent} />
            {/* Clean subtle rounded content frame outline */}
            <rect x="64" y="88" width="1205" height="602" rx="12" fill="none" stroke={border} strokeWidth="1.5" />
            {/* Subtle bottom-right angled corner wedge */}
            <polygon points="1220,750 1333,750 1333,635" fill={accent} />
          </>
        ))}

      {kind === 'architectural-frame' && (
        <>
          <rect x="0" y="0" width="1333" height="750" fill={bg} />
          {/* Continuous hairline rectangular frame inset 0.4in with subtle midpoint gaps */}
          {/* Top border with midpoint gap */}
          <line x1="40" y1="40" x2="625" y2="40" stroke={border} strokeWidth="1.5" />
          <line x1="708" y1="40" x2="1293" y2="40" stroke={border} strokeWidth="1.5" />
          {/* Bottom border with midpoint gap */}
          <line x1="40" y1="710" x2="625" y2="710" stroke={border} strokeWidth="1.5" />
          <line x1="708" y1="710" x2="1293" y2="710" stroke={border} strokeWidth="1.5" />
          {/* Left border with midpoint gap */}
          <line x1="40" y1="40" x2="40" y2="345" stroke={border} strokeWidth="1.5" />
          <line x1="40" y1="405" x2="40" y2="710" stroke={border} strokeWidth="1.5" />
          {/* Right border with midpoint gap */}
          <line x1="1293" y1="40" x2="1293" y2="345" stroke={border} strokeWidth="1.5" />
          <line x1="1293" y1="405" x2="1293" y2="710" stroke={border} strokeWidth="1.5" />
          {/* Delicate + registration crosshair on far-left */}
          <line x1="14" y1="375" x2="26" y2="375" stroke={heading} strokeWidth="1.5" />
          <line x1="20" y1="369" x2="20" y2="381" stroke={heading} strokeWidth="1.5" />
          {/* Delicate x registration crosshair on far-right */}
          <line x1="1308" y1="370" x2="1318" y2="380" stroke={heading} strokeWidth="1.5" />
          <line x1="1318" y1="370" x2="1308" y2="380" stroke={heading} strokeWidth="1.5" />
          {variant === 'content' && (
            <>
              <line x1="80" y1="125" x2="1253" y2="125" stroke={border} strokeWidth="1.2" />
              <rect x="80" y="122" width="110" height="5" fill={accent} />
            </>
          )}
        </>
      )}

      {kind === 'blue-wave-flow' &&
        (variant === 'title' ? (
          <>
            <rect x="0" y="0" width="1333" height="750" fill={bg} />
            {/* Small matching curved corner accents at top-left and bottom-left */}
            <path d="M 0 0 L 185 0 C 120 45 55 95 0 155 Z" fill={accentSoft} opacity="0.35" />
            <path d="M 0 610 C 65 650 130 700 190 750 L 0 750 Z" fill={accent} opacity="0.22" />
            {/* 3 smooth layered curved wave ribbons along right third */}
            <path
              d="M 900 0 C 830 220 960 470 860 750 L 1333 750 L 1333 0 Z"
              fill={accentSoft}
              opacity="0.45"
            />
            <path
              d="M 975 0 C 905 235 1030 485 930 750 L 1333 750 L 1333 0 Z"
              fill={accent}
              opacity="0.88"
            />
            <path
              d="M 1070 0 C 1010 250 1110 500 1020 750 L 1333 750 L 1333 0 Z"
              fill={heading}
            />
          </>
        ) : (
          <>
            <rect x="0" y="0" width="1333" height="750" fill={bg} />
            {/* Curved wave corner accent top-right */}
            <path d="M 1060 0 L 1333 0 L 1333 155 C 1220 120 1135 65 1060 0 Z" fill={accentSoft} opacity="0.4" />
            <path d="M 1145 0 L 1333 0 L 1333 105 C 1255 80 1195 45 1145 0 Z" fill={accent} opacity="0.85" />
            {/* Curved wave corner accent bottom-left */}
            <path d="M 0 625 C 75 660 155 700 220 750 L 0 750 Z" fill={accentSoft} opacity="0.35" />
            {/* Slim solid accent footer stripe */}
            <rect x="0" y="732" width="1333" height="18" fill={accent} />
          </>
        ))}

      {kind === 'editorial-split-dark' &&
        (variant === 'title' ? (
          <>
            {/* Full matte charcoal background */}
            <rect x="0" y="0" width="1333" height="750" fill={titleBg} />
            {/* Sweeping curved matte slate overlay on right */}
            <path
              d="M 885 0 C 790 250 960 510 835 750 L 1333 750 L 1333 0 Z"
              fill={surface}
            />
            {/* Soft warm sand curved accent arc along bottom-left edge */}
            <path
              d="M 0 615 C 190 660 350 705 495 750 L 0 750 Z"
              fill={accentSoft}
              opacity="0.92"
            />
          </>
        ) : (
          <>
            {/* Warm sand left/main panel */}
            <rect x="0" y="0" width="1333" height="750" fill={bg} />
            {/* Matte charcoal right accent panel divided by smooth sweeping curve */}
            <path
              d="M 895 0 C 855 240 935 510 875 750 L 1333 750 L 1333 0 Z"
              fill={titleBg}
            />
            {/* Subtle architectural accent seam */}
            <path
              d="M 895 0 C 855 240 935 510 875 750"
              fill="none"
              stroke={accent}
              strokeWidth="2.5"
              opacity="0.7"
            />
          </>
        ))}

      {kind === 'executive-concentric' && (
        <>
          <rect x="0" y="0" width="1333" height="750" fill={bg} />
          {/* 3 overlapping concentric circles anchored off right edge */}
          <circle cx="1340" cy="375" r="410" fill={surface} opacity="0.65" />
          <circle cx="1340" cy="375" r="290" fill={border} opacity="0.55" />
          <circle cx="1340" cy="375" r="175" fill={accent} />
          {/* Bottom structured takeaway strip (completely blank until populated) */}
          <rect x="85" y="615" width="1060" height="65" rx="4" fill={accentSoft} />
          <polygon points="85,615 365,615 338,680 85,680" fill={accent} />
        </>
      )}
    </svg>
  );
};

export default SlideVectorBackground;
