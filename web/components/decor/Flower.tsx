import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

interface WrapperProps {
  className?: string;
  style?: CSSProperties;
}

/**
 * Every flower in the Figma export (node 1195:6160) is a stem + a cluster of
 * five rotated petal ellipses around a differently-tinted centre ellipse —
 * the same construction at three sizes (a large pair, a single stem, a
 * three-head cluster) plus two small loose accent petals. Geometry below is
 * ported directly from the per-node SVG exports (nodes 1202:7404, 1201:7318,
 * 1202:7339, 1202:7383, 1202:7330); each tiny drop-shadow leaf that used
 * `feGaussianBlur` in the source is reproduced as a flat low-opacity fill
 * instead of a filter.
 */

export function PairFlower({ className, style }: WrapperProps) {
  return (
    <svg viewBox="0 0 124 121" className={cn("absolute", className)} style={style} aria-hidden="true">
      <path
        d="M45.1946 41.2707C45.2441 40.7303 45.6804 40.3068 46.222 40.2735C46.8116 40.2373 47.3244 40.6734 47.3834 41.2611L53.0938 98.1719L53.093 105.597C53.0929 106.654 52.2706 107.529 51.2157 107.593L45.0366 107.973C43.8683 108.045 42.8884 107.103 42.9144 105.932L44.082 53.4296L45.1946 41.2707Z"
        fill="#7A9E7A"
      />
      <ellipse cx="19.377" cy="10.3803" rx="19.377" ry="10.3803" transform="matrix(-0.885222 -0.465169 -0.579737 0.814803 51.291 86.167)" fill="#7A9E7A" />
      <ellipse cx="15.4725" cy="7.02612" rx="15.4725" ry="7.02612" transform="matrix(-0.821583 0.570088 0.675169 0.737663 66.7646 65.6777)" fill="#7A9E7A" />
      <path
        d="M41.4139 109.657C42.0461 111.268 44.3176 111.613 48.9887 110.98C51.6838 110.133 56.934 108.529 56.3019 106.918C54.5356 106.247 51.6509 105.153 46.6994 105.146C42.0283 105.779 40.7818 108.046 41.4139 109.657Z"
        fill="#7A9E7A"
        opacity="0.7"
      />
      <g>
        <ellipse cx="56.528" cy="14.9189" rx="13.6615" ry="13.8261" transform="rotate(-3.5176 56.528 14.9189)" fill="white" />
        <ellipse cx="27.9401" cy="23.0244" rx="15.3692" ry="15.5543" transform="rotate(-3.5176 27.9401 23.0244)" fill="white" />
        <ellipse cx="33.1169" cy="51.5655" rx="16.5077" ry="16.7065" transform="rotate(-3.5176 33.1169 51.5655)" fill="white" />
        <ellipse cx="61.5622" cy="41.1592" rx="14.8" ry="14.9783" transform="rotate(-3.5176 61.5622 41.1592)" fill="white" />
        <ellipse cx="44.0232" cy="34.1571" rx="13.6615" ry="13.8261" transform="rotate(-3.5176 44.0232 34.1571)" fill="#FDE68A" />
      </g>
      <path
        d="M96.8582 63.1052C97.0131 62.0116 98.0253 61.2506 99.1189 61.4055L101.66 61.7655C102.834 61.9318 103.606 63.0803 103.325 64.2327C98.6431 83.4111 97.3486 94.2208 96.6855 111.058C96.6388 112.245 95.5778 113.138 94.4017 112.971L91.8652 112.612C90.7716 112.457 90.0106 111.445 90.1655 110.351L96.8582 63.1052Z"
        fill="#7A9E7A"
      />
      <ellipse cx="13.23" cy="7.34562" rx="13.23" ry="7.34562" transform="matrix(-0.742627 -0.669705 -0.695841 0.718196 98.4873 97.6602)" fill="#7A9E7A" />
      <ellipse cx="10.5641" cy="4.97204" rx="10.5641" ry="4.97204" transform="matrix(-0.899412 0.437101 0.468995 0.883201 111.45 85.002)" fill="#7A9E7A" />
      <path
        d="M84.4139 113.657C85.0461 115.268 87.3176 115.613 91.9887 114.98C94.6838 114.133 99.934 112.529 99.3019 110.918C97.5356 110.247 94.6509 109.153 89.6994 109.146C85.0283 109.779 83.7818 112.046 84.4139 113.657Z"
        fill="#7A9E7A"
        opacity="0.7"
      />
      <g>
        <ellipse cx="108.086" cy="46.6928" rx="9.04623" ry="10.174" transform="rotate(8.06262 108.086 46.6928)" fill="white" />
        <ellipse cx="88.3988" cy="48.6145" rx="10.177" ry="11.4457" transform="rotate(8.06262 88.3988 48.6145)" fill="white" />
        <ellipse cx="87.665" cy="69.918" rx="10.9309" ry="12.2935" transform="rotate(8.06262 87.665 69.918)" fill="white" />
        <ellipse cx="107.59" cy="66.3176" rx="9.80008" ry="11.0218" transform="rotate(8.06262 107.59 66.3176)" fill="white" />
        <ellipse cx="97.2261" cy="58.8559" rx="9.04623" ry="10.174" transform="rotate(8.06262 97.2261 58.8559)" fill="#FDE68A" />
      </g>
    </svg>
  );
}

export function YellowFlower({ className, style }: WrapperProps) {
  return (
    <svg viewBox="0 0 93 94" className={cn("absolute", className)} style={style} aria-hidden="true">
      <ellipse cx="18.1442" cy="7.45064" rx="18.1442" ry="7.45064" transform="matrix(-0.820408 -0.571779 -0.852536 0.522669 46.1006 77.2734)" fill="#C3E09C" />
      <ellipse cx="14.488" cy="5.97406" rx="14.488" ry="5.97406" transform="matrix(-0.886373 0.462971 0.779263 0.626697 56.5791 58.3808)" fill="#BADC9B" />
      <path d="M79.1175 61.4536C82.9883 62.0285 86.3865 64.2529 87.2326 62.0937C88.0787 59.9345 86.3606 56.5998 82.0238 54.7792C77.2394 54.4003 74.5423 56.7926 73.6962 58.9518C72.8501 61.111 75.9493 60.9831 79.1175 61.4536Z" fill="#BADC9B" />
      <path
        d="M37.6427 35.984C37.7202 35.4519 38.1603 35.047 38.6971 35.014C39.3001 34.9769 39.8267 35.4184 39.8953 36.0187L44.6466 77.5814L44.5358 82.6022C44.5129 83.6419 43.697 84.4905 42.659 84.5543L36.5049 84.9326C35.313 85.0059 34.3228 84.025 34.3849 82.8324L36.3666 44.7453L37.6427 35.984Z"
        fill="#A4D49D"
      />
      <path
        d="M30.4149 86.6571C31.0471 88.268 33.3186 88.6128 37.9897 87.9801C40.6848 87.1325 45.935 85.5287 45.3028 83.9178C43.5366 83.2475 40.6519 82.1527 35.7004 82.1464C31.0293 82.7791 29.7828 85.0462 30.4149 86.6571Z"
        fill="#7A9E7A"
        opacity="0.7"
      />
      <g>
        <ellipse cx="39.7738" cy="13.9414" rx="10.2584" ry="11.0223" transform="rotate(-3.5176 39.7738 13.9414)" fill="#F8BA12" fillOpacity="0.86" />
        <ellipse cx="24.5038" cy="25.8641" rx="10.4727" ry="8.54816" transform="rotate(-3.5176 24.5038 25.8641)" fill="#F8BA12" fillOpacity="0.86" />
        <ellipse cx="30.0157" cy="40.0535" rx="10.9933" ry="8.94623" transform="rotate(-36.7499 30.0157 40.0535)" fill="#F8BA12" fillOpacity="0.86" />
        <ellipse cx="53.8535" cy="24.4072" rx="10.5001" ry="8.46976" transform="rotate(-3.5176 53.8535 24.4072)" fill="#F8BA12" fillOpacity="0.86" />
        <ellipse cx="48.2239" cy="38.7526" rx="9.61674" ry="10.7784" transform="rotate(-42.4757 48.2239 38.7526)" fill="#F8BA12" fillOpacity="0.86" />
        <ellipse cx="38.8486" cy="27.5927" rx="5.64165" ry="5.95013" transform="rotate(-3.5176 38.8486 27.5927)" fill="white" />
      </g>
    </svg>
  );
}

export function WhiteTrioFlower({ className, style }: WrapperProps) {
  return (
    <svg viewBox="0 0 80 94" className={cn("absolute", className)} style={style} aria-hidden="true">
      <path
        d="M39.1879 15.7011C39.4376 14.7094 40.3953 14.066 41.4078 14.2094L44.567 14.6569C45.6772 14.8142 46.4391 15.8593 46.2681 16.9674C43.5168 34.7971 46.1898 32.6705 37.075 83.554C36.9043 84.5065 36.0687 85.2373 35.1011 85.2376L31.6617 85.2385C30.5069 85.2388 29.5918 84.2638 29.6652 83.1114L30.772 65.7325L33.271 44.2307L34.7719 33.2324L39.1879 15.7011Z"
        fill="#7A9E7A"
      />
      <path
        d="M16.1211 60.404C15.577 59.4592 15.8899 58.2526 16.8246 57.6913L19.0482 56.3561C19.8881 55.8517 20.9723 56.0309 21.5992 56.7837C31.3544 68.4978 31.143 71.3093 35.3387 80.1361C35.783 81.0709 35.4649 82.1998 34.5831 82.7419L34.0317 83.081C33.1893 83.599 32.0949 83.4235 31.4566 82.6683L23.6832 73.4706C23.6061 73.3793 23.5373 73.2813 23.4776 73.1778L16.1211 60.404Z"
        fill="#7A9E7A"
      />
      <path
        d="M53.4935 63.5712C54.5384 66.1814 52.4802 68.9418 46.8152 72.9871C43.0313 74.7344 35.7107 78.1958 34.6658 75.5856C35.8367 72.9501 37.749 68.6457 43.0313 63.5347C48.6963 59.4894 52.4486 60.961 53.4935 63.5712Z"
        fill="#7A9E7A"
      />
      <path
        d="M18.1379 78.5347C17.8225 80.2363 19.5681 81.7301 23.8672 83.6634C26.6029 84.3692 31.907 85.7844 32.2224 84.0829C31.0777 82.5799 29.2084 80.1252 25.0092 77.5015C20.7101 75.5682 18.4533 76.8332 18.1379 78.5347Z"
        fill="#7A9E7A"
        opacity="0.7"
      />
      <path
        d="M40.9007 85.3185C40.4126 86.9787 38.1802 87.5219 33.4716 87.3024C30.7123 86.695 25.3415 85.559 25.8295 83.8988C27.53 83.0757 30.3073 81.7316 35.239 81.29C39.9477 81.5095 41.3887 83.6582 40.9007 85.3185Z"
        fill="#7A9E7A"
        opacity="0.7"
      />
      <g>
        <ellipse cx="55.6236" cy="22.7787" rx="7.59135" ry="7.70932" transform="rotate(30.1217 55.6236 22.7787)" fill="white" />
        <ellipse cx="39.8982" cy="17.7408" rx="8.54027" ry="8.67298" transform="rotate(30.1217 39.8982 17.7408)" fill="white" />
        <ellipse cx="33.4785" cy="32.5846" rx="9.17289" ry="9.31542" transform="rotate(30.1217 33.4785 32.5846)" fill="white" />
        <ellipse cx="49.8503" cy="36.5112" rx="8.22397" ry="8.35176" transform="rotate(30.1217 49.8503 36.5112)" fill="white" />
        <ellipse cx="43.8999" cy="27.8607" rx="7.59135" ry="7.70932" transform="rotate(30.1217 43.8999 27.8607)" fill="#FDE68A" />
      </g>
      <g>
        <ellipse cx="19.0141" cy="51.1081" rx="4.12288" ry="4.89885" transform="rotate(20.9601 19.0141 51.1081)" fill="white" />
        <ellipse cx="11.2759" cy="53.362" rx="4.209" ry="3.79922" transform="rotate(20.9601 11.2759 53.362)" fill="white" />
        <ellipse cx="4.56375" cy="3.86576" rx="4.56375" ry="3.86576" transform="matrix(0.966084 -0.258227 0.168236 0.985747 5.64883 57.416)" fill="white" />
        <ellipse cx="22.2489" cy="57.7299" rx="4.22003" ry="3.76437" transform="rotate(20.9601 22.2489 57.7299)" fill="white" />
        <ellipse cx="4.03171" cy="4.6146" rx="4.03171" ry="4.6146" transform="matrix(0.934565 -0.355792 0.26241 0.964956 12.6088 59.5762)" fill="white" />
        <ellipse cx="16.1962" cy="56.4877" rx="2.2674" ry="2.64452" transform="rotate(20.9601 16.1962 56.4877)" fill="#FDE68A" />
      </g>
      <g>
        <ellipse cx="62.4918" cy="44.511" rx="4.79237" ry="5.48675" transform="rotate(36.6748 62.4918 44.511)" fill="white" />
        <ellipse cx="53.2471" cy="44.4326" rx="4.89246" ry="4.25515" transform="rotate(36.6748 53.2471 44.4326)" fill="white" />
        <ellipse cx="5.23906" cy="4.37283" rx="5.23906" ry="4.37283" transform="matrix(0.999531 0.0306204 -0.0886874 0.99606 45.8207 47)" fill="white" />
        <ellipse cx="64.1518" cy="52.7703" rx="4.90529" ry="4.21613" transform="rotate(36.6748 64.1518 52.7703)" fill="white" />
        <ellipse cx="4.61126" cy="5.23734" rx="4.61126" ry="5.23734" transform="matrix(0.997475 -0.0710186 0.00903616 0.999959 52.9154 51.625)" fill="white" />
        <ellipse cx="57.7964" cy="49.438" rx="2.63558" ry="2.96189" transform="rotate(36.6748 57.7964 49.438)" fill="#FDE68A" />
      </g>
    </svg>
  );
}

export function LilacPetal({ className, style }: WrapperProps) {
  return (
    <svg viewBox="0 0 41 41" className={cn("absolute", className)} style={style} aria-hidden="true">
      <ellipse cx="26.3357" cy="14.5698" rx="5.73247" ry="6.26879" transform="rotate(42.1881 26.3357 14.5698)" fill="#A59FF1" />
      <ellipse cx="15.5345" cy="13.1954" rx="5.8522" ry="4.86165" transform="rotate(42.1881 15.5345 13.1954)" fill="#A59FF1" />
      <ellipse cx="6.17612" cy="5.06153" rx="6.17612" ry="5.06153" transform="matrix(0.989037 0.147665 -0.163616 0.986524 6.63316 15.1387)" fill="#A59FF1" />
      <ellipse cx="27.5689" cy="24.369" rx="5.86754" ry="4.81706" transform="rotate(42.1881 27.5689 24.369)" fill="#A59FF1" />
      <ellipse cx="5.41186" cy="6.08798" rx="5.41186" ry="6.08798" transform="matrix(0.99886 0.0477299 -0.0649244 0.99789 14.5306 21.4834)" fill="#A59FF1" />
      <ellipse cx="20.424" cy="19.6275" rx="3.15259" ry="3.38406" transform="rotate(42.1881 20.424 19.6275)" fill="white" />
      <path
        d="M9.11625 28.9801C9.55808 30.0326 11.0742 30.287 14.1744 29.9408C15.9569 29.4284 19.4297 28.461 18.9879 27.4085C17.8036 26.9501 15.8696 26.2013 12.5744 26.1296C9.47421 26.4758 8.67441 27.9277 9.11625 28.9801Z"
        fill="#8F8DA9"
        opacity="0.7"
      />
    </svg>
  );
}

export function SmallYellowPetal({ className, style }: WrapperProps) {
  return (
    <svg viewBox="0 0 23 24" className={cn("absolute", className)} style={style} aria-hidden="true">
      <ellipse cx="13.8191" cy="7.11788" rx="3.52099" ry="4.14536" transform="rotate(20.9601 13.8191 7.11788)" fill="#F8BA12" fillOpacity="0.86" />
      <ellipse cx="7.22455" cy="9.00768" rx="3.59453" ry="3.21486" transform="rotate(20.9601 7.22455 9.00768)" fill="#F8BA12" fillOpacity="0.86" />
      <ellipse cx="3.88524" cy="3.27905" rx="3.88524" ry="3.27905" transform="matrix(0.967202 -0.254009 0.17222 0.985058 2.43585 12.4258)" fill="#F8BA12" fillOpacity="0.86" />
      <ellipse cx="16.5955" cy="12.7365" rx="3.60395" ry="3.18538" transform="rotate(20.9601 16.5955 12.7365)" fill="#F8BA12" fillOpacity="0.86" />
      <ellipse cx="3.42915" cy="3.91744" rx="3.42915" ry="3.91744" transform="matrix(0.936181 -0.351519 0.266643 0.963795 8.37824 14.2754)" fill="#F8BA12" fillOpacity="0.86" />
      <ellipse cx="11.429" cy="11.6671" rx="1.93638" ry="2.23777" transform="rotate(20.9601 11.429 11.6671)" fill="white" />
    </svg>
  );
}
