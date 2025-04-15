import { Link } from "wouter";

const AboutPreview = () => {
  return (
    <section id="about" className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">
              À propos de Diversité Artistique Montréal
            </h2>
            <p className="text-gray-600 mb-4">
              Diversité Artistique Montréal (DAM) est un organisme à but non lucratif qui se consacre
              à promouvoir la diversité culturelle dans les arts au Québec. Depuis notre fondation,
              nous travaillons activement pour soutenir les artistes de tous horizons et créer des
              ponts entre les différentes communautés culturelles.
            </p>
            <p className="text-gray-600 mb-6">
              Le Bottin des artistes est une initiative visant à offrir une plateforme de visibilité
              aux artistes, tout en favorisant les échanges et les collaborations au sein de la
              communauté artistique québécoise.
            </p>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/about#mission">
                <a className="text-[#FF5500] hover:text-opacity-80 font-medium flex items-center">
                  Notre mission <i className="fas fa-arrow-right ml-2"></i>
                </a>
              </Link>
              <Link href="/about#team">
                <a className="text-[#FF5500] hover:text-opacity-80 font-medium flex items-center">
                  Notre équipe <i className="fas fa-arrow-right ml-2"></i>
                </a>
              </Link>
              <Link href="/about#contact">
                <a className="text-[#FF5500] hover:text-opacity-80 font-medium flex items-center">
                  Nous contacter <i className="fas fa-arrow-right ml-2"></i>
                </a>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1545128485-c400ce7b6892?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
                alt="Artistes diversifiés"
                className="w-full h-64 object-cover"
              />
            </div>
            <div className="rounded-lg overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1511379938547-c1f69419868d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
                alt="Musiciens en studio"
                className="w-full h-64 object-cover"
              />
            </div>
            <div className="rounded-lg overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1560420025-9453f02b4751?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
                alt="Exposition artistique"
                className="w-full h-64 object-cover"
              />
            </div>
            <div className="rounded-lg overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1496024840928-4c417adf211d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
                alt="Danseurs en performance"
                className="w-full h-64 object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutPreview;
