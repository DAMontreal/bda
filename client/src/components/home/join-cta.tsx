import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const JoinCta = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-20 bg-[#FF5500]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            Rejoignez notre communauté d'artistes
          </h2>
          <p className="text-xl mb-8">
            Créez votre profil, connectez-vous avec d'autres artistes et accédez à des opportunités
            uniques
          </p>

          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            {!isAuthenticated ? (
              <Link href="/register">
                <Button className="bg-white text-[#FF5500] hover:bg-gray-100 font-bold py-3 px-8 rounded-full">
                  Créer mon profil
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard">
                <Button className="bg-white text-[#FF5500] hover:bg-gray-100 font-bold py-3 px-8 rounded-full">
                  Mon profil
                </Button>
              </Link>
            )}
            <Link href="/about">
              <Button
                variant="outline"
                className="bg-transparent border-2 border-white hover:bg-white hover:text-[#FF5500] text-white font-bold py-3 px-8 rounded-full"
              >
                En savoir plus
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinCta;
