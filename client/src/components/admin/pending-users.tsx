import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getDisciplineLabel } from "@/lib/utils";

const PendingUsers = () => {
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch users pending approval
  const { data: pendingUsers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users?approved=false"],
  });

  // Approve user mutation
  const approveUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("PUT", `/api/users/${userId}`, { isApproved: true });
    },
    onSuccess: () => {
      // Invalider toutes les requêtes concernant les utilisateurs
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      // Invalider spécifiquement la requête des utilisateurs en attente
      queryClient.invalidateQueries({ queryKey: ["/api/users?approved=false"] });
      // Invalider les utilisateurs approuvés
      queryClient.invalidateQueries({ queryKey: ["/api/users?approved=true"] });
      
      toast({
        title: "Utilisateur approuvé",
        description: "L'utilisateur a été approuvé avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'approbation",
      });
    },
  });

  // Reject user mutation
  const rejectUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("DELETE", `/api/users/${userId}`, undefined);
    },
    onSuccess: () => {
      // Invalider toutes les requêtes concernant les utilisateurs
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      // Invalider spécifiquement la requête des utilisateurs en attente
      queryClient.invalidateQueries({ queryKey: ["/api/users?approved=false"] });
      
      toast({
        title: "Utilisateur rejeté",
        description: "L'utilisateur a été rejeté avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors du rejet",
      });
    },
  });

  // Toggle user details visibility
  const toggleUserDetails = (userId: number) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  // Handle user approval
  const handleApproveUser = (userId: number) => {
    if (confirm("Êtes-vous sûr de vouloir approuver cet utilisateur?")) {
      approveUserMutation.mutate(userId);
    }
  };

  // Handle user rejection
  const handleRejectUser = (userId: number) => {
    if (confirm("Êtes-vous sûr de vouloir rejeter cet utilisateur? Cette action est irréversible.")) {
      rejectUserMutation.mutate(userId);
    }
  };

  // Get initials for avatar fallback
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 bg-gray-200 rounded-full mr-4"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
            <div className="flex justify-end space-x-2">
              <div className="h-10 w-24 bg-gray-200 rounded"></div>
              <div className="h-10 w-24 bg-gray-200 rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!pendingUsers || pendingUsers.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500 mb-2">Aucun utilisateur en attente d'approbation</p>
        <p className="text-sm text-gray-400">Tous les comptes ont été traités</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingUsers.map((user) => (
        <Card key={user.id} className="p-6">
          <div className="flex items-center mb-4">
            <Avatar className="h-12 w-12 mr-4">
              <AvatarImage src={user.profileImage || ""} alt={`${user.firstName} ${user.lastName}`} />
              <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center">
                <h3 className="font-bold text-lg">{user.firstName} {user.lastName}</h3>
                {user.discipline && (
                  <Badge variant="outline" className="ml-2">
                    {getDisciplineLabel(user.discipline)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {user.email} • Inscription: {new Date(user.createdAt || new Date()).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {expandedUser === user.id && (
            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Nom d'utilisateur</h4>
                  <p className="text-gray-700">{user.username}</p>
                </div>
                {user.location && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Localisation</h4>
                    <p className="text-gray-700">{user.location}</p>
                  </div>
                )}
              </div>
              
              {user.bio && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-1">Biographie</h4>
                  <p className="text-gray-700">{user.bio}</p>
                </div>
              )}
              
              {user.website && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-1">Site web</h4>
                  <a 
                    href={user.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {user.website}
                  </a>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => toggleUserDetails(user.id)}
              className="text-gray-600"
            >
              <Eye className="mr-2 h-4 w-4" /> 
              {expandedUser === user.id ? "Masquer les détails" : "Voir les détails"}
            </Button>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-red-500 text-red-500 hover:bg-red-50"
                onClick={() => handleRejectUser(user.id)}
                disabled={rejectUserMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" /> Rejeter
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleApproveUser(user.id)}
                disabled={approveUserMutation.isPending}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Approuver
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PendingUsers;