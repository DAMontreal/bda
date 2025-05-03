import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, ChevronDown, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import MessageBadge from "@/components/messages/message-badge";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("FR");
  const [location] = useLocation();
  const { isAuthenticated, user, isAdmin, logout } = useAuth();
  const isMobile = useIsMobile();

  // Close mobile menu when navigating or screen size changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location, isMobile]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Labels for different languages
  const languageLabels = {
    FR: {
      home: "Accueil",
      artists: "Artistes",
      events: "Événements",
      trocdam: "TROC'DAM",
      login: "Connexion",
      register: "Inscription",
      profile: "Mon profil",
      messages: "Messages",
      admin: "Administration",
      logout: "Déconnexion",
      search: "Rechercher",
      backToSite: "Retour au site"
    },
    EN: {
      home: "Home",
      artists: "Artists",
      events: "Events",
      trocdam: "TROC'DAM",
      login: "Login",
      register: "Register",
      profile: "My Profile",
      messages: "Messages",
      admin: "Administration",
      logout: "Logout",
      search: "Search",
      backToSite: "Back to site"
    },
    ES: {
      home: "Inicio",
      artists: "Artistas",
      events: "Eventos",
      trocdam: "TROC'DAM",
      login: "Iniciar sesión",
      register: "Registrarse",
      profile: "Mi Perfil",
      messages: "Mensajes",
      admin: "Administración",
      logout: "Cerrar sesión",
      search: "Buscar",
      backToSite: "Volver al sitio"
    }
  };

  const labels = languageLabels[currentLanguage as keyof typeof languageLabels];

  const menuItems = [
    { path: "/", label: labels.home },
    { path: "/artists", label: labels.artists },
    { path: "/events", label: labels.events },
    { path: "/trocdam", label: labels.trocdam },
    { path: "https://www.diversiteartistique.org", label: labels.backToSite, external: true },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="bg-[#FF5500] text-white font-bold text-2xl p-2 rounded">DAM</div>
              <span className="ml-2 text-black font-bold text-lg">Bottin des artistes</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            {menuItems.map((item) => (
              item.external ? (
                <a 
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-[#FF5500] transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`font-medium hover:text-[#FF5500] transition-colors ${
                    location === item.path ? "text-[#FF5500]" : ""
                  }`}
                >
                  {item.label}
                </Link>
              )
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-12 p-0">
                  {currentLanguage} <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCurrentLanguage("FR")}>Français</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentLanguage("EN")}>English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentLanguage("ES")}>Español</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {!isAuthenticated ? (
              <div className="hidden md:flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" className="font-medium">
                    {labels.login}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-[#FF5500] hover:bg-opacity-90 text-white">
                    {labels.register}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      {labels.admin}
                    </Button>
                  </Link>
                )}
                <Link href="/dashboard">
                  <Button variant="ghost" className="font-medium">
                    {labels.profile}
                  </Button>
                </Link>
                <Link href="/messages">
                  <Button variant="ghost" className="font-medium flex items-center">
                    {labels.messages}
                    <MessageBadge />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => logout()}
                  className="font-medium"
                >
                  {labels.logout}
                </Button>
              </div>
            )}

            <button className="md:hidden text-black" onClick={toggleMenu}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex flex-col space-y-3">
              {menuItems.map((item) => (
                item.external ? (
                  <a
                    key={item.path}
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium py-2 hover:text-[#FF5500] transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`font-medium py-2 hover:text-[#FF5500] transition-colors ${
                      location === item.path ? "text-[#FF5500]" : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              ))}
              
              {!isAuthenticated ? (
                <>
                  <Link
                    href="/login"
                    className="font-medium py-2 hover:text-[#FF5500] transition-colors"
                  >
                    {labels.login}
                  </Link>
                  <Link href="/register">
                    <Button className="w-full bg-[#FF5500] hover:bg-opacity-90 text-white">
                      {labels.register}
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className="font-medium py-2 hover:text-[#FF5500] transition-colors"
                  >
                    {labels.profile}
                  </Link>
                  <Link
                    href="/messages"
                    className="font-medium py-2 hover:text-[#FF5500] transition-colors flex items-center"
                  >
                    {labels.messages}
                    <MessageBadge />
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="font-medium py-2 hover:text-[#FF5500] transition-colors"
                    >
                      {labels.admin}
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => logout()}
                    className="w-full"
                  >
                    {labels.logout}
                  </Button>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
