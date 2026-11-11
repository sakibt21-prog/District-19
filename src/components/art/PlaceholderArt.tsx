import { isLight, shade } from "@/lib/format";
import type { Category } from "@/lib/types";

/*
  Drawn stand-ins for product photos. They are used only when a product has no
  uploaded photo, so the scenes can be seen and tested before real cut-out
  photography exists. Everything is tinted from the product's colour.
*/

interface ArtProps {
  category: Category;
  cut: string;
  color: string;
  back?: boolean;
  className?: string;
  /** Accessible name. Leave empty when a visible label sits next to the art. */
  label?: string;
}

function lines(color: string) {
  const light = isLight(color);
  return {
    seam: light ? shade(color, -0.22) : shade(color, 0.22),
    dark: shade(color, -0.28),
    lite: shade(color, 0.18),
    ink: light ? "#1c1917" : "#fafaf9",
  };
}

function Shirt({ cut, color, back }: { cut: string; color: string; back?: boolean }) {
  const c = lines(color);
  const long = cut === "overshirt";
  const body = long
    ? "M86 20 L154 20 L206 42 L234 196 L198 204 L186 112 L186 246 Q120 254 54 246 L54 112 L42 204 L6 196 L34 42 Z"
    : "M82 22 Q120 50 158 22 L206 42 L236 96 L200 116 L188 98 L188 246 Q120 254 52 246 L52 98 L40 116 L4 96 L34 42 Z";
  return (
    <>
      <path d={body} fill={color} stroke={c.dark} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Soft side shading so the flat shape reads as cloth. */}
      <path
        d={long ? "M186 112 L186 246 Q160 251 140 252 L150 60 Z" : "M188 98 L188 246 Q160 251 140 252 L150 60 Z"}
        fill={c.dark}
        opacity="0.14"
      />
      <path
        d={long ? "M54 244 Q120 252 186 244" : "M52 236 Q120 244 188 236"}
        fill="none"
        stroke={c.seam}
        strokeWidth="1.5"
      />
      <path d="M64 62 L54 104 M176 62 L186 104" fill="none" stroke={c.seam} strokeWidth="1.5" />

      {long ? (
        back ? (
          <path d="M86 20 Q120 34 154 20 M70 62 Q120 74 170 62" fill="none" stroke={c.seam} strokeWidth="1.5" />
        ) : (
          <>
            <path d="M86 20 L120 52 L154 20 L140 14 L120 30 L100 14 Z" fill={c.lite} stroke={c.dark} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M120 52 L120 250" stroke={c.seam} strokeWidth="1.5" />
            {[78, 112, 146, 180, 214].map((y) => (
              <circle key={y} cx="120" cy={y} r="2.6" fill={c.ink} opacity="0.7" />
            ))}
            <rect x="138" y="86" width="30" height="34" rx="1" fill="none" stroke={c.seam} strokeWidth="1.5" />
          </>
        )
      ) : (
        <>
          <path
            d={back ? "M82 22 Q120 36 158 22" : "M82 22 Q120 50 158 22"}
            fill="none"
            stroke={cut === "jersey" ? c.ink : c.seam}
            strokeWidth={cut === "jersey" ? 5 : 4}
            strokeLinecap="round"
            opacity={cut === "jersey" ? 0.85 : 1}
          />
          {cut === "jersey" && (
            <>
              <path d="M4 96 L40 116 M236 96 L200 116" stroke={c.ink} strokeWidth="5" opacity="0.85" />
              <text
                x="120"
                y={back ? 170 : 150}
                textAnchor="middle"
                fontSize={back ? 84 : 20}
                textLength={back ? 96 : 112}
                lengthAdjust="spacingAndGlyphs"
                fontWeight="800"
                fill={c.ink}
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                {back ? "19" : "DISTRICT"}
              </text>
              {!back && (
                <text
                  x="120"
                  y="184"
                  textAnchor="middle"
                  fontSize="34"
                  textLength="44"
                  lengthAdjust="spacingAndGlyphs"
                  fontWeight="800"
                  fill={c.ink}
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  19
                </text>
              )}
            </>
          )}
          {cut !== "jersey" &&
            (back ? (
              <text
                x="120"
                y="66"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                letterSpacing="2"
                fill={c.ink}
                opacity="0.75"
              >
                DISTRICT 19
              </text>
            ) : (
              <text x="150" y="92" fontSize="12" fontWeight="800" fill={c.ink} opacity="0.8">
                D19
              </text>
            ))}
        </>
      )}
    </>
  );
}

function Pant({ cut, color, back }: { cut: string; color: string; back?: boolean }) {
  const c = lines(color);
  const slim = cut === "trouser";
  const body = slim
    ? "M36 10 L164 10 L168 40 L178 288 L114 290 L100 100 L86 290 L22 288 L32 40 Z"
    : "M30 10 L170 10 L176 40 L194 288 L110 290 L100 96 L90 290 L6 288 L24 40 Z";
  return (
    <>
      <path d={body} fill={color} stroke={c.dark} strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d={slim ? "M100 100 L114 290 L178 288 L168 40 L140 40 Z" : "M100 96 L110 290 L194 288 L176 40 L140 40 Z"}
        fill={c.dark}
        opacity="0.12"
      />
      <path d={slim ? "M34 28 L166 28" : "M27 28 L173 28"} stroke={c.seam} strokeWidth="1.5" />
      {[52, 100, 148].map((x) => (
        <path key={x} d={`M${x} 10 L${x} 28`} stroke={c.seam} strokeWidth="3" />
      ))}
      {back ? (
        <>
          <rect x="44" y="52" width="38" height="42" rx="2" fill="none" stroke={c.seam} strokeWidth="1.5" />
          <rect x="118" y="52" width="38" height="42" rx="2" fill="none" stroke={c.seam} strokeWidth="1.5" />
          <path d="M100 28 L100 96" stroke={c.seam} strokeWidth="1.5" />
        </>
      ) : (
        <>
          <path d="M100 28 L100 84 Q100 96 88 96" fill="none" stroke={c.seam} strokeWidth="1.5" />
          <path d="M36 30 Q58 58 30 72 M164 30 Q142 58 170 72" fill="none" stroke={c.seam} strokeWidth="1.5" />
          <circle cx="100" cy="19" r="3" fill={c.ink} opacity="0.7" />
        </>
      )}
      {cut === "cargo" && (
        <>
          <rect x="14" y="124" width="34" height="46" rx="2" fill={c.lite} stroke={c.seam} strokeWidth="1.5" />
          <rect x="152" y="124" width="34" height="46" rx="2" fill={c.lite} stroke={c.seam} strokeWidth="1.5" />
          <path d="M14 138 L48 138 M152 138 L186 138" stroke={c.seam} strokeWidth="1.5" />
        </>
      )}
      {slim && !back && (
        <path d="M60 44 L54 286 M140 44 L146 286" stroke={c.seam} strokeWidth="1" opacity="0.8" />
      )}
      <path
        d={slim ? "M22 276 L86 278 M114 278 L178 276" : "M6 276 L90 278 M110 278 L194 276"}
        stroke={c.seam}
        strokeWidth="1.5"
      />
    </>
  );
}

function Shoe({ cut, color }: { cut: string; color: string }) {
  const c = lines(color);
  const high = cut === "high";
  const runner = cut === "runner";
  const upper = high
    ? "M22 120 C14 84 20 40 46 30 L88 22 C100 20 108 26 112 40 L122 66 C146 92 196 102 250 108 C274 110 288 116 288 122 L22 122 Z"
    : "M22 120 C16 94 26 68 50 60 L96 48 C108 44 118 48 126 60 L150 86 C176 100 214 104 250 108 C274 110 288 116 288 122 L22 122 Z";
  const heel = high
    ? "M22 120 C14 84 20 40 46 30 L60 28 C50 60 52 98 62 122 Z"
    : "M22 120 C16 94 26 68 50 60 L62 58 C54 80 56 104 64 122 Z";
  const sole = runner
    ? "M12 122 Q4 150 30 154 L272 154 Q298 150 292 126 L288 118 L18 118 Z"
    : "M14 122 Q10 146 30 148 L276 148 Q294 146 290 126 L286 118 L18 118 Z";
  const laces: [number, number, number, number][] = high
    ? [
        [104, 34, 122, 30],
        [110, 48, 130, 44],
        [118, 62, 140, 58],
        [130, 76, 152, 72],
        [146, 88, 168, 84],
      ]
    : [
        [116, 56, 136, 52],
        [126, 68, 148, 64],
        [138, 80, 160, 76],
        [152, 90, 174, 86],
      ];
  return (
    <>
      <ellipse cx="150" cy="160" rx="132" ry="5" fill="#0c0a09" opacity="0.08" />
      <path d={sole} fill="#f5f5f4" stroke="#a8a29e" strokeWidth="1.5" strokeLinejoin="round" />
      {runner && <path d="M20 138 L286 138" stroke="#d6d3d1" strokeWidth="2" />}
      <path d={upper} fill={color} stroke={c.dark} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={heel} fill={c.dark} opacity="0.35" />
      <path
        d="M214 104 C246 106 282 112 288 122 L204 122 C202 114 206 106 214 104 Z"
        fill={c.lite}
        stroke={c.dark}
        strokeWidth="1"
      />
      <path
        d={high ? "M88 122 L120 66 L136 72 L108 122 Z" : "M92 122 L128 76 L144 82 L112 122 Z"}
        fill={c.ink}
        opacity="0.85"
      />
      {laces.map(([x1, y1, x2, y2]) => (
        <path
          key={`${x1}-${y1}`}
          d={`M${x1} ${y1} L${x2} ${y2}`}
          stroke={c.ink}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.9"
        />
      ))}
      <path
        d={high ? "M46 30 L88 22" : "M50 60 L96 48"}
        stroke={c.seam}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </>
  );
}

const VIEWBOX: Record<Category, string> = {
  shirt: "0 0 240 260",
  pant: "0 0 200 300",
  shoe: "0 0 300 170",
};

export function PlaceholderArt({ category, cut, color, back, className, label }: ArtProps) {
  return (
    <svg
      viewBox={VIEWBOX[category]}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={category === "shoe" && back ? "translate(300 0) scale(-1 1)" : undefined}>
        {category === "shirt" && <Shirt cut={cut} color={color} back={back} />}
        {category === "pant" && <Pant cut={cut} color={color} back={back} />}
        {category === "shoe" && <Shoe cut={cut} color={color} />}
      </g>
    </svg>
  );
}

/** Wire hanger drawn above garments on the rail. */
export function Hanger({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 56" className={className} aria-hidden="true">
      <path
        d="M120 26 C120 18 130 18 130 11 C130 5 125 2 120 2 C115 2 111 5 111 9"
        fill="none"
        stroke="#57534e"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M120 26 L30 50 Q24 54 32 54 L208 54 Q216 54 210 50 Z"
        fill="none"
        stroke="#57534e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ModelProps {
  top: string;
  bottom: string;
  shoes: string;
  topCut?: string;
  className?: string;
  label?: string;
}

/** Drawn mannequin for a look that has no model photo yet. */
export function ModelArt({ top, bottom, shoes, topCut, className, label }: ModelProps) {
  const skin = "#c8beb2";
  const t = lines(top);
  const b = lines(bottom);
  const long = topCut === "overshirt";
  return (
    <svg
      viewBox="0 0 140 360"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      preserveAspectRatio="xMidYMax meet"
    >
      <ellipse cx="70" cy="352" rx="54" ry="4" fill="#0c0a09" opacity="0.08" />
      {/* Legs */}
      <path
        d="M30 170 L110 170 L118 330 L76 332 L70 222 L64 332 L22 330 Z"
        fill={bottom}
        stroke={b.dark}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M70 222 L76 332 L118 330 L110 170 L92 170 Z" fill={b.dark} opacity="0.14" />
      {/* Shoes */}
      <path d="M18 330 L64 332 L64 346 L12 346 Q10 334 18 330 Z" fill={shoes} stroke="#44403c" strokeWidth="1" />
      <path d="M76 332 L122 330 Q130 334 128 346 L76 346 Z" fill={shoes} stroke="#44403c" strokeWidth="1" />
      <path d="M12 346 L64 346 M76 346 L128 346" stroke="#f5f5f4" strokeWidth="3" />
      {/* Arms */}
      {!long && (
        <>
          <path d="M9 128 L25 132 L23 196 Q17 204 11 196 Z" fill={skin} />
          <path d="M131 128 L115 132 L117 196 Q123 204 129 196 Z" fill={skin} />
        </>
      )}
      {/* Top */}
      <path
        d={
          long
            ? "M42 58 Q70 68 98 58 L122 70 L132 196 L114 198 L108 104 L108 180 L32 180 L32 104 L26 198 L8 196 L18 70 Z"
            : "M42 58 Q70 68 98 58 L124 72 L134 132 L114 136 L108 102 L108 180 L32 180 L32 102 L26 136 L6 132 L16 72 Z"
        }
        fill={top}
        stroke={t.dark}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M108 102 L108 180 L86 180 L92 66 Z" fill={t.dark} opacity="0.12" />
      {long && (
        <>
          <path d="M9 196 L25 198 L24 208 Q17 214 10 208 Z" fill={skin} />
          <path d="M131 196 L115 198 L116 208 Q123 214 130 208 Z" fill={skin} />
          <path d="M70 66 L70 180" stroke={t.seam} strokeWidth="1.2" />
        </>
      )}
      {/* Head and neck */}
      <path d="M62 44 L78 44 L80 62 Q70 68 60 62 Z" fill={skin} />
      <ellipse cx="70" cy="30" rx="15" ry="18" fill={skin} />
      <path d="M55 28 Q54 10 70 10 Q86 10 85 28 Q78 18 70 19 Q62 18 55 28 Z" fill="#292524" />
    </svg>
  );
}
