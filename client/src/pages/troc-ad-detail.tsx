import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { TrocAd, User } from "@shared/schema";
import { formatDateWithTime, getTrocCategoryLabel } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import FormattedText from "@/components/ui/formatted-text";

const TrocAdDetail = () => {
  const [, params] = useRoute("/troc/:id");
  const adId = params?.id;
  const { isAuthenticated } = useAuth();

  // Fetch the specific ad
  const { data: ad, isLoading: adLoading } = useQuery<TrocAd>({
    queryKey: [`/api/troc/${adId}`],
    enabled: !!adId,
  });

  // Fetch user data for the ad creator
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/users/${ad?.userId}`],
    enabled: !!ad?.userId,
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  if (adLoading || userLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="bg-white border rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-2 mb-6">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-gray-200 rounded-full mr-3"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-medium mb-2">Annonce introuvable</h3>
            <p className="text-gray-500 mb-4">
              Cette annonce n'existe pas ou a été supprimée.
            </p>
            <Button asChild variant="outline">
              <Link href="/trocdam">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux annonces
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/trocdam">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux annonces
        </Link>
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-3">{ad.title}</h1>
              <Badge variant="secondary" className="bg-gray-100 text-black">
                {getTrocCategoryLabel(ad.category)}
              </Badge>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Description</h2>
            <div className="text-gray-700 leading-relaxed">
              <FormattedText text={ad.description} />
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start">
              <div className="flex items-center mb-4 sm:mb-0">
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarImage 
                    src={user?.profileImage || ""}
                    alt={user ? `${user.firstName} ${user.lastName}` : "Utilisateur"}
                  />
                  <AvatarFallback>
                    {user ? getInitials(user.firstName, user.lastName) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  {user ? (
                    <Link 
                      href={`/artists/${user.id}`} 
                      className="font-medium hover:text-[#FF5500] transition-colors"
                    >
                      {user.firstName} {user.lastName}
                    </Link>
                  ) : (
                    <span className="font-medium">Utilisateur</span>
                  )}
                  <p className="text-sm text-gray-500">
                    Publié le {formatDateWithTime(ad.createdAt || new Date())}
                  </p>
                </div>
              </div>

              {isAuthenticated && user ? (
                <Button 
                  className="bg-[#FF5500] hover:bg-[#F89720]"
                  asChild
                >
                  <Link href={`/messages/${user.id}`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Contacter l'annonceur
                  </Link>
                </Button>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">
                    Connectez-vous pour contacter l'annonceur
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/login">Se connecter</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrocAdDetail;