import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TrocAd, User } from "@shared/schema";
import { formatTimeAgo, getTrocCategoryLabel } from "@/lib/utils";
import { MessageSquare, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import FormattedText from "@/components/ui/formatted-text";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ImageCarousel from "@/components/trocdam/image-carousel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TrocAdCardProps {
  ad: TrocAd;
}

const TrocAdCard = ({ ad }: TrocAdCardProps) => {
  const { isAuthenticated, isAdmin, user: currentUser } = useAuth();
  const { toast } = useToast();
  
  // Fetch user data for the ad creator
  const { data: user } = useQuery<User>({
    queryKey: [`/api/users/${ad.userId}`],
    enabled: !!ad.userId,
  });

  // Mutation for deleting ad
  const deleteAdMutation = useMutation({
    mutationFn: async (adId: number) => {
      const response = await apiRequest('DELETE', `/api/troc/${adId}`);
      if (!response.ok) {
        throw new Error('Échec de la suppression');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/troc'] });
      toast({
        title: "Annonce supprimée",
        description: "L'annonce a été supprimée avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'annonce.",
        variant: "destructive",
      });
    },
  });

  // Get initials for avatar fallback
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  // Support multi-images : diviser imageUrl par des virgules s'il y en a plusieurs
  const imageUrls = ad.imageUrl ? ad.imageUrl.split(',').map(url => url.trim()).filter(url => url.length > 0) : [];

  return (
    <Card className="border border-gray-300 rounded-lg hover:border-[#FF5500] transition-colors overflow-hidden">
      <Link href={`/troc/${ad.id}`}>
        <div className="cursor-pointer">
          <ImageCarousel 
            images={imageUrls}
            title={ad.title}
            className="h-48"
          />
          <div className="p-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-bold">{ad.title}</h4>
              <Badge variant="secondary" className="bg-gray-100 text-black text-xs px-2 py-1 rounded">
                {getTrocCategoryLabel(ad.category)}
              </Badge>
            </div>
            <div className="text-gray-500 text-sm mb-4">
              {ad.description.length > 120 ? (
                <p>{ad.description.substring(0, 120)}...</p>
              ) : (
                <FormattedText text={ad.description} />
              )}
            </div>
          </div>
        </div>
      </Link>
      <div className="p-4">
        <div className="flex justify-between items-center">
          {user && (
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profileImage || ""} alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback className="bg-gray-300 text-gray-600 text-xs">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(new Date(ad.createdAt))}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            {isAuthenticated && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/messages?with=${ad.userId}`}>
                  <MessageSquare className="h-4 w-4" />
                </Link>
              </Button>
            )}
            
            {/* Boutons d'édition et suppression pour les propriétaires et admins */}
            {isAuthenticated && (currentUser?.id === ad.userId || isAdmin) && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/troc/${ad.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer l'annonce</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteAdMutation.mutate(ad.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TrocAdCard;