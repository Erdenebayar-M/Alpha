import { useId } from "react";
import { cn } from "@/lib/cn";

interface MascotProps {
  className?: string;
}

/**
 * The ORto globe mascot, ported from Figma node 1202:7512 ("Sound idle
 * component"). Geometry, gradients and the green-hill/cloud/earbud/face
 * layout below are the exact exported paths; three simplifications were
 * made to hit the performance budget without changing what it looks like:
 *
 *  - The lilac/pink/blue halo (3 overlapping `feGaussianBlur` ellipses in
 *    the source) is three plain SVG ellipses with a transparent-center /
 *    colored-rim radial gradient each (the blur's actual visual job — no
 *    filter region to rasterize on every float-animation frame). Getting
 *    the direction of that gradient right matters: earlier passes had it
 *    inverted (bright center, fading out), which reads as a glow escaping
 *    the character instead of a soft rim hugging it.
 *  - The arms (Figma: an inside-stroke boolean-op silhouette, ~28KB of path
 *    data for two limbs) are redrawn as a single stroked path per arm plus
 *    an ellipse "mitten" cap, fitted to the same curve measured pixel-by-
 *    pixel off the Figma export (attach at the sphere's equator, bow
 *    outward past the silhouette, stop at ~72% of the sphere's height) —
 *    same curved-arm silhouette and attachment point, negligible bytes.
 *  - The soft white sheen ellipses on the sphere's upper-right (3 blurred
 *    18%-opacity layers in the source) share one radial-gradient fill
 *    instead of a blur filter, so the softness survives without a filter
 *    region to rasterize on every float-animation frame.
 *
 * Everything else — the green-hill clip, the three inline clouds, both
 * earbuds, the eyes/smile/headband — is the real exported path data.
 *
 * Sized by `aspect-[352/312]` (the source viewBox's own ratio) rather than
 * forced into a square box, so callers only need to set a width — height
 * follows automatically and the art never letterboxes.
 *
 * Rendered once (Hero.tsx resizes/reorders the same instance per
 * breakpoint instead of mounting it twice), so `useId()` only ever needs to
 * disambiguate this component from itself across separate page instances,
 * not two copies on the same page.
 */
export default function Mascot({ className }: MascotProps) {
  const uid = useId();
  const bodyGrad = `mascot-body-${uid}`;
  const shadeGrad = `mascot-shade-${uid}`;
  const bodyClip = `mascot-clip-${uid}`;
  const hillGradA = `mascot-hill-a-${uid}`;
  const hillGradB = `mascot-hill-b-${uid}`;
  const hillGradC = `mascot-hill-c-${uid}`;
  const sheenGrad = `mascot-sheen-${uid}`;
  const tipGrad = `mascot-tip-${uid}`;
  const headGrad = `mascot-head-${uid}`;
  const stemGrad = `mascot-stem-${uid}`;
  const grilleGrad = `mascot-grille-${uid}`;
  const metalGrad = `mascot-metal-${uid}`;
  const haloPurple = `mascot-halo-purple-${uid}`;
  const haloPink = `mascot-halo-pink-${uid}`;
  const haloBlue = `mascot-halo-blue-${uid}`;

  return (
    <div className={cn("relative aspect-[352/312] animate-float", className)}>
      <svg viewBox="0 0 352 312" className="absolute inset-0 h-full w-full" role="img" aria-label="ОРто дүрс, санал болгож буй туслах">
        <defs>
          <radialGradient id={haloPurple} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="#CDB8FF" stopOpacity="0.35" />
          </radialGradient>
          <radialGradient id={haloPink} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="#F2D7FF" stopOpacity="0.65" />
          </radialGradient>
          <radialGradient id={haloBlue} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#094BAA" stopOpacity="0" />
            <stop offset="78%" stopColor="#094BAA" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#094BAA" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={bodyGrad} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#C8E6FF" />
            <stop offset="55%" stopColor="#7DBEFF" />
            <stop offset="100%" stopColor="#4F9EF5" />
          </radialGradient>
          <linearGradient id={shadeGrad} x1="0.1" y1="-116.06" x2="201.34" y2="254.61" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C8E6FF" />
            <stop offset="0.55" stopColor="#2F83E4" />
            <stop offset="1" stopColor="#4F9EF5" />
          </linearGradient>
          <clipPath id={bodyClip}>
            <circle cx="150.693" cy="163.722" r="107.987" />
          </clipPath>
          <linearGradient id={hillGradA} x1="78" y1="233" x2="145" y2="266" gradientUnits="userSpaceOnUse">
            <stop stopColor="#85DD54" />
            <stop offset="1" stopColor="#63CB4A" />
          </linearGradient>
          <linearGradient id={hillGradB} x1="127" y1="224" x2="207" y2="268" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C8F56A" />
            <stop offset="1" stopColor="#9BE850" />
          </linearGradient>
          <linearGradient id={hillGradC} x1="111" y1="234" x2="165" y2="272" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.18" />
            <stop offset="0.75" stopColor="#7ED952" />
          </linearGradient>
          <radialGradient id={sheenGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.55" />
            <stop offset="60%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={tipGrad} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="white" />
            <stop offset="0.6" stopColor="#F3F2EE" />
            <stop offset="1" stopColor="#D9D7D2" />
          </linearGradient>
          <linearGradient id={headGrad} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#F5CFC2" />
            <stop offset="0.55" stopColor="#F0BDAE" />
            <stop offset="1" stopColor="#DFA293" />
          </linearGradient>
          <linearGradient id={stemGrad} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#F3C8BA" />
            <stop offset="0.7" stopColor="#EDB7A8" />
            <stop offset="1" stopColor="#D79B8E" />
          </linearGradient>
          <linearGradient id={grilleGrad} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#2C2B2A" />
            <stop offset="1" stopColor="#050505" />
          </linearGradient>
          <linearGradient id={metalGrad} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#F8F8F5" />
            <stop offset="0.38" stopColor="#A7ABA8" />
            <stop offset="0.68" stopColor="#E7E7E2" />
            <stop offset="1" stopColor="#7D817F" />
          </linearGradient>
        </defs>

        <g opacity="0.94">
          <ellipse cx="151" cy="157" rx="146" ry="134" fill={`url(#${haloBlue})`} />
          <ellipse cx="151" cy="157" rx="140" ry="129" fill={`url(#${haloPink})`} />
          <ellipse cx="151" cy="157" rx="134" ry="123" fill={`url(#${haloPurple})`} />
        </g>

        <ellipse cx="149.7" cy="256.2" rx="81.24" ry="13.73" fill="#073CC2" opacity="0.12" />

        <circle cx="150.693" cy="163.722" r="107.987" fill={`url(#${bodyGrad})`} />
        <circle cx="150.695" cy="163.722" r="107.987" fill={`url(#${shadeGrad})`} fillOpacity="0.18" />

        <g clipPath={`url(#${bodyClip})`}>
          <path
            d="M78.1229 248.955C79.2665 241.605 98.6301 232.505 114.554 233.031C129.451 233.522 139.378 251.495 145.078 265.966C143.478 275.374 120.487 271.23 95.0822 261.282L78.1574 249.933L78.1229 248.955Z"
            fill={`url(#${hillGradA})`}
          />
          <path
            d="M127.58 268.212C125.611 254.064 133.349 235.36 150.733 227.409C159.333 223.494 171.026 224.175 180.562 229.536C193.188 236.694 209.047 245.642 206.707 260.457C187.634 269.661 162.614 278.34 127.58 268.212Z"
            fill={`url(#${hillGradB})`}
          />
          <path
            d="M111.22 260.191C114.41 249.215 125.827 236.788 140.495 234.348C147.746 233.154 155.669 236.021 160.582 241.952C167.067 249.85 170.511 261.507 164.106 272.114C154.585 273.6 134.25 271.564 111.22 260.191Z"
            fill={`url(#${hillGradC})`}
            fillOpacity="0.05"
          />
          <path
            opacity="0.45"
            d="M149.34 250.737C157.674 253.016 170.009 251.518 175.998 245.158C174.483 252.584 162.652 258.132 150.052 255.485C149.84 253.818 149.614 252.395 149.34 250.737Z"
            fill="#83D84C"
          />
          <path
            opacity="0.35"
            d="M145.687 247.641C144.353 246.699 142.498 247.014 141.545 248.345C140.592 249.676 140.9 251.518 142.235 252.46L143.961 250.051L145.687 247.641ZM169.784 257.742C171.371 257.323 172.322 255.706 171.908 254.13C171.494 252.554 169.872 251.616 168.285 252.035L169.035 254.888L169.784 257.742ZM143.961 250.051L142.235 252.46C150.251 258.12 160.817 260.107 169.784 257.742L169.035 254.888L168.285 252.035C161.115 253.926 152.35 252.345 145.687 247.641L143.961 250.051Z"
            fill="#83D84C"
          />
          <path d="M112.317 256.008C112.375 256.484 112.81 256.822 113.288 256.762C113.767 256.703 114.109 256.269 114.051 255.793L113.184 255.901L112.317 256.008ZM112.2 250.79C111.923 250.398 111.379 250.305 110.984 250.582C110.588 250.859 110.492 251.4 110.769 251.792L111.484 251.291L112.2 250.79ZM113.184 255.901L114.051 255.793C113.826 253.939 113.287 252.329 112.2 250.79L111.484 251.291L110.769 251.792C111.664 253.059 112.12 254.387 112.317 256.008L113.184 255.901Z" fill="#168953" />
          <path d="M115.157 256.759C114.943 257.189 115.12 257.71 115.552 257.92C115.984 258.131 116.508 257.953 116.722 257.523L115.94 257.141L115.157 256.759ZM117.06 252.963C116.937 252.5 116.459 252.225 115.993 252.35C115.527 252.474 115.248 252.951 115.371 253.414L116.216 253.188L117.06 252.963ZM115.94 257.141L116.722 257.523C117.451 256.057 117.474 254.522 117.06 252.963L116.216 253.188L115.371 253.414C115.706 254.672 115.655 255.758 115.157 256.759L115.94 257.141Z" fill="#168953" />
          <path d="M118.245 257.473C117.815 257.691 117.642 258.214 117.86 258.641C118.078 259.068 118.603 259.237 119.034 259.019L118.639 258.246L118.245 257.473ZM122.696 256.776C123.081 256.484 123.156 255.939 122.865 255.558C122.574 255.177 122.026 255.105 121.642 255.396L122.169 256.086L122.696 256.776ZM118.639 258.246L119.034 259.019C120.508 258.271 121.662 257.559 122.696 256.776L122.169 256.086L121.642 255.396C120.706 256.104 119.645 256.762 118.245 257.473L118.639 258.246Z" fill="#168953" />
        </g>

        <circle cx="215.09" cy="88.77" r="38" fill={`url(#${sheenGrad})`} />
        <circle cx="201.59" cy="148.05" r="41.8" fill={`url(#${sheenGrad})`} />
        <circle cx="141.78" cy="108.9" r="30" fill={`url(#${sheenGrad})`} />

        <path
          d="M51 173C46 180 40 190 39.5 201C39.5 206 40.5 210 42 213"
          stroke="#17191B"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="47" cy="225" rx="13" ry="9" transform="rotate(40 47 225)" fill="#17191B" />
        <path
          d="M250 173C255 180 261 190 261.5 201C261.5 206 260.5 210 259 213"
          stroke="#17191B"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="254" cy="225" rx="13" ry="9" transform="rotate(-40 254 225)" fill="#17191B" />

        <g opacity="0.96">
          <path d="M76.813 158.955C78.1337 154.378 82.0958 153.582 84.1502 156.965C85.7644 151.99 91.3407 152.388 92.6614 158.159C96.33 157.363 98.9714 160.746 98.9714 165.124H74.3184C74.3184 161.94 75.3456 159.95 76.813 158.955Z" fill="white" />
          <path d="M74.3955 166.005H99.8649" stroke="#F9FBFF" strokeWidth="6.967" strokeLinecap="round" opacity="0.7" />
        </g>
        <g opacity="0.96">
          <path d="M209.671 175.556C210.522 172.697 213.218 172.143 214.424 174.541C215.488 171.498 218.965 171.774 219.745 175.187C221.874 174.726 223.576 176.755 223.505 179.245H207.968C208.039 177.401 208.677 176.109 209.671 175.556Z" fill="white" />
          <path d="M208.105 179.244H223.505" stroke="#F9FBFF" strokeWidth="6.967" strokeLinecap="round" opacity="0.7" />
        </g>
        <g opacity="0.96">
          <path d="M209.671 95.4368C210.522 92.5775 213.218 92.0241 214.424 94.4222C215.488 91.3784 218.965 91.6552 219.745 95.0679C221.874 94.6067 223.576 96.6359 223.505 99.1263H207.968C208.039 97.2816 208.677 95.9903 209.671 95.4368Z" fill="white" />
          <path d="M208.105 99.125H223.505" stroke="#F9FBFF" strokeWidth="6.967" strokeLinecap="round" opacity="0.7" />
        </g>

        <g>
          <path d="M244.435 114C240.729 113.473 237.68 115.464 236.664 118.744C235.767 121.731 237.441 125.069 240.729 126.182C243.18 127.06 246.168 126.24 247.603 124.249C249.098 122.141 249.157 119.212 247.603 116.987C246.826 115.64 245.75 114.469 244.435 114Z" fill={`url(#${tipGrad})`} />
          <path d="M259.846 117.25C259.035 112.986 254.852 109.729 249.545 109.729C243.365 109.729 238.933 113.637 238.933 119.145C238.933 123.706 242.054 126.963 246.486 127.792C247.86 128.088 249.296 127.97 250.732 127.733H251.044C252.417 127.615 253.728 127.2 254.977 126.548C258.722 124.653 260.595 121.041 259.846 117.25Z" fill={`url(#${headGrad})`} />
          <path d="M257.101 126.37C257.101 124.534 255.54 123.054 253.605 123.054H251.295C249.36 123.054 247.799 124.534 247.799 126.37V143.427C247.799 145.974 249.921 148.047 252.606 148.047H252.294C254.978 148.047 257.101 145.974 257.101 143.427V126.37Z" fill={`url(#${stemGrad})`} />
          <path d="M254.604 117.251C254.604 116.27 253.766 115.475 252.731 115.475C251.697 115.475 250.858 116.27 250.858 117.251V122.582C250.858 123.563 251.697 124.358 252.731 124.358C253.766 124.358 254.604 123.563 254.604 122.582V117.251Z" fill={`url(#${grilleGrad})`} />
          <path d="M247.984 143.546C248.796 144.671 250.606 145.263 252.479 145.263C254.352 145.263 256.1 144.671 256.912 143.546C256.599 146.211 254.727 147.632 252.479 147.632C250.232 147.632 248.359 146.211 247.984 143.546Z" fill={`url(#${metalGrad})`} />
        </g>
        <g>
          <path d="M60.4098 114C64.1161 113.473 67.1647 115.464 68.181 118.744C69.0776 121.731 67.4039 125.069 64.1161 126.182C61.6652 127.06 58.6763 126.24 57.2416 124.249C55.7472 122.141 55.6874 119.212 57.2416 116.987C58.0187 115.64 59.0947 114.469 60.4098 114Z" fill={`url(#${tipGrad})`} />
          <path d="M44.9987 117.25C45.8102 112.986 49.9929 109.729 55.2993 109.729C61.4797 109.729 65.9121 113.637 65.9121 119.145C65.9121 123.706 62.7907 126.963 58.3583 127.792C56.9849 128.088 55.549 127.97 54.1132 127.733H53.801C52.4276 127.615 51.1166 127.2 49.8681 126.548C46.1224 124.653 44.2495 121.041 44.9987 117.25Z" fill={`url(#${headGrad})`} />
          <path d="M47.7441 126.37C47.7441 124.534 49.3048 123.054 51.2401 123.054H53.5499C55.4852 123.054 57.0459 124.534 57.0459 126.37V143.427C57.0459 145.974 54.9233 148.047 52.2389 148.047H52.5511C49.8667 148.047 47.7441 145.974 47.7441 143.427V126.37Z" fill={`url(#${stemGrad})`} />
          <path d="M50.2406 117.251C50.2406 116.27 51.0791 115.475 52.1135 115.475C53.1478 115.475 53.9863 116.27 53.9863 117.251V122.582C53.9863 123.563 53.1478 124.358 52.1135 124.358C51.0791 124.358 50.2406 123.563 50.2406 122.582V117.251Z" fill={`url(#${grilleGrad})`} />
          <path d="M56.8604 143.546C56.0488 144.671 54.2384 145.263 52.3655 145.263C50.4927 145.263 48.7447 144.671 47.9331 143.546C48.2453 146.211 50.1181 147.632 52.3655 147.632C54.6129 147.632 56.4858 146.211 56.8604 143.546Z" fill={`url(#${metalGrad})`} />
        </g>

        <path
          d="M94.976 76.6794C105.528 73.6554 127.455 66.6341 127.455 66.6341C127.455 66.6341 171.468 55.5324 186.597 52.8744C192.443 52.33 193.629 52.4385 196.788 57.4959C198.052 61.3468 195.6 64.4249 190.11 65.7119C171.461 70.0214 139.027 75.8823 133.487 77.8067C127.947 79.7312 96.5207 86.7585 94.4749 87.6423C90.7331 89.2588 84.424 79.7033 94.976 76.6794Z"
          fill="#17191B"
        />

        <g style={{ transformBox: "fill-box", transformOrigin: "center" }} className="animate-blink">
          <g>
            <circle cx="175.46" cy="120.18" r="20.9" fill="white" />
            <circle cx="173.89" cy="120.73" r="12.6" fill="#111111" />
            <circle cx="183.27" cy="115.17" r="3.3" fill="white" />
          </g>
          <g>
            <circle cx="130.18" cy="120.18" r="20.9" fill="white" />
            <circle cx="130.54" cy="120.73" r="12.6" fill="#111111" />
            <circle cx="136.05" cy="115.17" r="3.3" fill="white" />
          </g>
        </g>

        <path
          d="M141.505 153.922C140.141 151.357 136.973 150.348 134.43 151.669C131.887 152.989 130.931 156.14 132.295 158.705L136.9 156.314L141.505 153.922ZM175.102 158.481C176.257 155.856 175.048 152.757 172.403 151.558C169.758 150.359 166.677 151.514 165.523 154.138L170.312 156.31L175.102 158.481ZM136.9 156.314L132.295 158.705C136.476 166.565 145.391 170.595 153.547 170.905C161.845 171.22 171.038 167.718 175.102 158.481L170.312 156.31L165.523 154.138C163.629 158.442 159.162 160.669 153.767 160.464C148.229 160.254 143.417 157.516 141.505 153.922L136.9 156.314Z"
          fill="#111111"
        />
      </svg>
    </div>
  );
}
