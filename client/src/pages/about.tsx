import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Phone, Mail, MapPin, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const About = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">À propos de Diversité Artistique Montréal</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4" id="mission">Notre mission</h2>
              <p className="text-gray-600 mb-4">
                Diversité Artistique Montréal (DAM) est un organisme à but non lucratif qui se consacre à promouvoir 
                la diversité culturelle dans les arts au Québec. Depuis notre fondation, nous travaillons activement 
                pour soutenir les artistes de tous horizons et créer des ponts entre les différentes communautés 
                culturelles.
              </p>
              <p className="text-gray-600 mb-4">
                Notre mission est d'améliorer les conditions socioéconomiques des artistes issus de la diversité 
                culturelle, en favorisant leur inclusion et leur rayonnement dans les différents réseaux culturels 
                et artistiques montréalais et québécois.
              </p>
              <p className="text-gray-600 mb-6">
                Le Bottin des artistes est une initiative visant à offrir une plateforme de visibilité aux artistes, 
                tout en favorisant les échanges et les collaborations au sein de la communauté artistique québécoise.
              </p>
              
              <h2 className="text-2xl font-bold mb-4" id="services">Nos services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="border border-gray-200 rounded p-4">
                  <h3 className="font-bold text-xl mb-2">Répertoire d'artistes</h3>
                  <p className="text-gray-600">
                    Une plateforme pour découvrir des artistes diversifiés, rechercher des talents et explorer 
                    différentes disciplines artistiques.
                  </p>
                </div>
                
                <div className="border border-gray-200 rounded p-4">
                  <h3 className="font-bold text-xl mb-2">Réseau professionnel</h3>
                  <p className="text-gray-600">
                    Un espace pour connecter artistes, diffuseurs, producteurs et autres acteurs du milieu culturel.
                  </p>
                </div>
                
                <div className="border border-gray-200 rounded p-4">
                  <h3 className="font-bold text-xl mb-2">TROC'DAM</h3>
                  <p className="text-gray-600">
                    Un système d'échange et de petites annonces pour favoriser la collaboration entre artistes.
                  </p>
                </div>
                
                <div className="border border-gray-200 rounded p-4">
                  <h3 className="font-bold text-xl mb-2">Événements culturels</h3>
                  <p className="text-gray-600">
                    Un calendrier des activités artistiques à venir, permettant de promouvoir et découvrir des 
                    événements diversifiés.
                  </p>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-4" id="team">Notre équipe</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-3">
                    <img 
                      src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80" 
                      alt="Directrice générale" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-bold">Sophie Martin</h3>
                  <p className="text-gray-600 text-sm">Directrice générale</p>
                </div>
                
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-3">
                    <img 
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d" 
                      alt="Responsable des communications" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-bold">Michel Tremblay</h3>
                  <p className="text-gray-600 text-sm">Responsable des communications</p>
                </div>
                
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-3">
                    <img 
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2" 
                      alt="Chargée de projets" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-bold">Amina Hassan</h3>
                  <p className="text-gray-600 text-sm">Chargée de projets</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4" id="contact">Nous contacter</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-[#F89720] mt-1 mr-3 flex-shrink-0" />
                  <span>3680 Rue Jeanne-Mance, Montréal, QC H2X 2K5</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-[#F89720] mr-3 flex-shrink-0" />
                  <span>(514) 555-1234</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-[#F89720] mr-3 flex-shrink-0" />
                  <span>info@diversiteartistique.org</span>
                </div>
              </div>
              
              <div className="mt-6">
                <Button className="w-full bg-[#F89720]">
                  Nous envoyer un message
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Rejoignez-nous</h2>
              <p className="text-gray-600 mb-4">
                Vous êtes un artiste issu de la diversité culturelle? Créez votre profil pour profiter de nos services.
              </p>
              
              {!isAuthenticated ? (
                <div className="space-y-3">
                  <Button className="w-full bg-[#F89720]" asChild>
                    <Link href="/register">S'inscrire</Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/login">Se connecter</Link>
                  </Button>
                </div>
              ) : (
                <Button className="w-full bg-[#F89720]" asChild>
                  <Link href="/dashboard">Mon profil</Link>
                </Button>
              )}
              
              <div className="mt-6">
                <a 
                  href="https://www.diversiteartistique.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-[#F89720] hover:underline"
                >
                  Visiter notre site web principal <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">Partenaires et soutiens</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 border border-gray-200 rounded flex items-center justify-center h-24">
              <span className="font-bold text-gray-500">Conseil des arts de Montréal</span>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded flex items-center justify-center h-24">
              <span className="font-bold text-gray-500">Conseil des arts du Québec</span>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded flex items-center justify-center h-24">
              <span className="font-bold text-gray-500">Conseil des arts du Canada</span>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded flex items-center justify-center h-24">
              <span className="font-bold text-gray-500">Ville de Montréal</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default About;
