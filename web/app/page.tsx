import Header from "@/components/layout/Header";
import Hero from "@/components/sections/Hero";
import Pricing from "@/components/sections/Pricing";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <Pricing />
      </main>
    </>
  );
}
