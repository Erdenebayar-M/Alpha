import { CloudShape } from "@/components/decor/CloudShape";

/**
 * The hero's 9 clouds, positioned as percentages of the 1440x927 artwork
 * crop (see Hills.tsx for why 927, not the full 1327). See CloudShape.tsx
 * for the shape/blur technique shared with the register-child flow's clouds.
 */
export default function Clouds() {
  return (
    <>
      <CloudShape left={3.429} top={7.989} width={14.857} height={9.764} opacity={1} drift="slow" />
      <CloudShape left={8.571} top={4.438} width={10.857} height={8.877} opacity={1} drift="slow" />
      <CloudShape left={14.857} top={7.101} width={8.571} height={7.989} opacity={1} drift="slow" />
      <CloudShape left={80.571} top={9.764} width={16.571} height={9.764} opacity={0.96} drift="slower" />
      <CloudShape left={64.559} top={24.947} width={16.571} height={9.764} opacity={0.96} drift="slower" />
      <CloudShape left={86.857} top={5.326} width={12.571} height={8.877} opacity={0.96} drift="slower" />
      <CloudShape left={93.143} top={4.438} width={10.286} height={7.989} opacity={0.96} drift="slower" />
      <CloudShape left={45.714} top={12.427} width={11.429} height={7.101} opacity={0.9} drift="slow" />
      <CloudShape left={50.286} top={8.877} width={8} height={6.214} opacity={0.9} drift="slow" />
    </>
  );
}
