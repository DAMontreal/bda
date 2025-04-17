import { useState, useEffect } from "react";
import Hero from "@/components/home/hero";
import SearchSection from "@/components/home/search-section";
import FeaturedArtists from "@/components/home/featured-artists";
import UpcomingEvents from "@/components/home/upcoming-events";
import TrocDamPreview from "@/components/home/trocdam-preview";
import Testimonials from "@/components/home/testimonials";
import JoinCta from "@/components/home/join-cta";

const Home = () => {
  const [isClient, setIsClient] = useState(false);

  // Utilisation d'un state pour s'assurer que le code ne s'exécute que côté client
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-t-4 border-dam-orange border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Hero />
      <SearchSection />
      <FeaturedArtists />
      <UpcomingEvents />
      <TrocDamPreview />
      <Testimonials />
      <JoinCta />
    </>
  );
};

export default Home;
