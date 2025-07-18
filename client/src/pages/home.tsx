import Hero from "@/components/home/hero";
import SearchSection from "@/components/home/search-section";
import FeaturedArtists from "@/components/home/featured-artists";
import UpcomingEvents from "@/components/home/upcoming-events";
import TrocDamPreview from "@/components/home/trocdam-preview";
import JoinCta from "@/components/home/join-cta";

const Home = () => {
  return (
    <>
      <Hero />
      <SearchSection />
      <FeaturedArtists />
      <UpcomingEvents />
      <TrocDamPreview />
      <JoinCta />
    </>
  );
};

export default Home;
