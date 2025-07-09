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
  const { isAuthenticated, isAdmin } = useAuth();
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

  return (
    <Card className="border border-gray-300 rounded-lg hover:border-[#FF5500] transition-colors overflow-hidden">
      <Link href={`/troc/${ad.id}`}>
        <div className="cursor-pointer">
          {ad.imageUrl && (
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
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
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage 
                src={user?.profileImage || ""}
                alt={user ? `${user.firstName} ${user.lastName}` : "Utilisateur"}
              />
              <AvatarFallback>
                {user ? getInitials(user.firstName, user.lastName) : "?"}
              </AvatarFallback>
            </Avatar>
            {user ? (
              <span className="text-sm">
                {user.firstName} {user.lastName.charAt(0)}.
              </span>
            ) : (
              <span className="text-sm">Utilisateur</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{formatTimeAgo(ad.createdAt || new Date())}</span>
            
            {/* Admin controls */}
            {isAdmin && (
              <div className="flex gap-1">
                <Link href={`/troc/${ad.id}/edit`}>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 w-7 p-0" 
                    onClick={(e) => e.stopPropagation()}
                    title="Modifier l'annonce"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </Link>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" 
                      onClick={(e) => e.stopPropagation()}
                      title="Supprimer l'annonce"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer l'annonce</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action ne peut pas être annulée.
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
              </div>
            )}
            
            {isAuthenticated && user && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 px-2 text-sm flex items-center gap-1" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `/messages/${user.id}`;
                }}
              >
                <MessageSquare className="h-4 w-4" /> Contacter
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TrocAdCard;