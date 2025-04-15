import { Link } from "wouter";

const Hero = () => {
  return (
    <section className="relative bg-black text-white overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1517457373958-b7bdd4587205?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')",
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(248,151,32,0.95)] to-[rgba(248,151,32,0.8)] opacity-75"></div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 font-heading">
            Découvrez des artistes de la diversité du Québec
          </h1>
          <p className="text-xl mb-8">
            Une plateforme pour promouvoir et connecter des talents artistiques de tous horizons
          </p>

          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href="/artists" className="bg-white text-black hover:bg-gray-200 font-bold py-3 px-8 rounded-full transition-colors inline-block text-center">
                Explorer les artistes
            </Link>
            <Link href="/register" className="bg-transparent border-2 border-white hover:bg-white hover:text-black font-bold py-3 px-8 rounded-full transition-colors inline-block text-center">
                Créer mon profil
            </Link>
          </div>
        </div>

        <div className="mt-16 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="h-0.5 w-full bg-white bg-opacity-20"></div>
          </div>
          <div className="flex justify-center relative">
            <span className="bg-dam-orange px-4 py-1 text-white text-sm uppercase tracking-wider rounded">
              Diversité Artistique Montréal
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
