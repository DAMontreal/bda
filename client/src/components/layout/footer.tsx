import { Link } from "wouter";
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube, 
  MapPin, 
  Phone, 
  Mail, 
  ChevronDown
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-black text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center mb-4">
              <div className="bg-[#FF5500] text-white font-bold text-2xl p-2 rounded">DAM</div>
              <span className="ml-2 text-white font-bold text-lg">Bottin des artistes</span>
            </div>
            <p className="text-gray-300 mb-4">
              Une initiative de Diversité Artistique Montréal pour promouvoir la diversité culturelle dans les arts.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-[#FF5500]">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-[#FF5500]">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-[#FF5500]">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-[#FF5500]">
                <Youtube size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-[#FF5500]">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/artists" className="text-gray-300 hover:text-[#FF5500]">
                  Artistes
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-gray-300 hover:text-[#FF5500]">
                  Événements
                </Link>
              </li>
              <li>
                <Link href="/trocdam" className="text-gray-300 hover:text-[#FF5500]">
                  TROC'DAM
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-300 hover:text-[#FF5500]">
                  À propos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/register" className="text-gray-300 hover:text-[#FF5500]">
                  Créer un compte
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-gray-300 hover:text-[#FF5500]">
                  Se connecter
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-300 hover:text-[#FF5500]">
                  Tableau de bord
                </Link>
              </li>
              <li>
                <Link href="#faq" className="text-gray-300 hover:text-[#FF5500]">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-gray-300 hover:text-[#FF5500]">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <MapPin className="mr-3 text-[#FF5500] h-5 w-5 mt-1 flex-shrink-0" />
                <span className="text-gray-300">
                  3680 Rue Jeanne-Mance, Montréal, QC H2X 2K5
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="mr-3 text-[#FF5500] h-5 w-5 flex-shrink-0" />
                <span className="text-gray-300">(514) 555-1234</span>
              </li>
              <li className="flex items-center">
                <Mail className="mr-3 text-[#FF5500] h-5 w-5 flex-shrink-0" />
                <span className="text-gray-300">info@diversiteartistique.org</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-300 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} Diversité Artistique Montréal. Tous droits réservés.
          </p>
          <div className="flex flex-wrap space-x-4 text-sm">
            <a href="#terms" className="text-gray-300 hover:text-[#FF5500]">
              Conditions d'utilisation
            </a>
            <a href="#privacy" className="text-gray-300 hover:text-[#FF5500]">
              Politique de confidentialité
            </a>
            <div className="relative group">
              <button className="flex items-center text-gray-300 hover:text-[#FF5500]">
                FR <ChevronDown className="ml-1 h-4 w-4" />
              </button>
              <div className="hidden group-hover:block absolute right-0 bg-white rounded shadow-md z-50">
                <div className="p-2 w-20">
                  <a href="#" className="block py-1 px-2 text-black hover:bg-gray-100 rounded">
                    FR
                  </a>
                  <a href="#" className="block py-1 px-2 text-black hover:bg-gray-100 rounded">
                    EN
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
