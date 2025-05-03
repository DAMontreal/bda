import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserX, ShieldCheck, Shield, UserCog } from "lucide-react";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getDisciplineLabel } from "@/lib/utils";
import EditUserProfile from "./edit-user-profile";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all approved users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users?approved=true"],
  });

  // Toggle admin status mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => {
      return apiRequest("PUT", `/api/users/${userId}`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Statut d'administrateur modifié",
        description: "Le statut d'administrateur a été modifié avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la modification du statut",
      });
    },
  });

  // Disable user mutation
  const disableUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("PUT", `/api/users/${userId}`, { isApproved: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Utilisateur désactivé",
        description: "L'utilisateur a été désactivé avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la désactivation",
      });
    },
  });

  // Handle admin toggle
  const handleToggleAdmin = (userId: number, currentStatus: boolean) => {
    const action = currentStatus ? "retirer les droits d'administrateur de" : "faire";
    if (confirm(`Êtes-vous sûr de vouloir ${action} cet utilisateur administrateur?`)) {
      toggleAdminMutation.mutate({ userId, isAdmin: !currentStatus });
    }
  };

  // Handle user disable
  const handleDisableUser = (userId: number) => {
    if (confirm("Êtes-vous sûr de vouloir désactiver cet utilisateur? Il ne pourra plus se connecter.")) {
      disableUserMutation.mutate(userId);
    }
  };
  
  // Handle edit user
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };
  
  // Handle edit dialog close
  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    // Leave a slight delay before clearing the user to avoid UI flicker
    setTimeout(() => {
      setEditingUser(null);
    }, 200);
  };

  // Get initials for avatar fallback
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  // Filter users based on search term
  const filteredUsers = users?.filter(
    (user) =>
      `${user.firstName} ${user.lastName} ${user.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="mb-6 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gray-200 rounded-full mr-3"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="space-x-2 flex">
                <div className="h-9 w-9 bg-gray-200 rounded"></div>
                <div className="h-9 w-9 bg-gray-200 rounded"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Rechercher un utilisateur..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {!filteredUsers || filteredUsers.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-500">
            {searchTerm ? "Aucun utilisateur ne correspond à votre recherche" : "Aucun utilisateur trouvé"}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={user.profileImage || ""} alt={`${user.firstName} ${user.lastName}`} />
                    <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                      {user.isAdmin && (
                        <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                          Admin
                        </Badge>
                      )}
                      {user.discipline && (
                        <Badge variant="outline" className="ml-2">
                          {getDisciplineLabel(user.discipline)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Modifier le profil"
                    onClick={() => handleEditUser(user)}
                    className="text-orange-600 hover:text-orange-800"
                  >
                    <UserCog className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={user.isAdmin ? "Retirer les droits d'administrateur" : "Faire administrateur"}
                    onClick={() => handleToggleAdmin(user.id, user.isAdmin || false)}
                    className={user.isAdmin ? "text-blue-600 hover:text-blue-800" : "text-gray-600 hover:text-gray-800"}
                  >
                    {user.isAdmin ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Désactiver l'utilisateur"
                    onClick={() => handleDisableUser(user.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <UserX className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Dialog for editing user profile */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>
            {editingUser ? `Modifier le profil de ${editingUser.firstName} ${editingUser.lastName}` : 'Modifier le profil'}
          </DialogTitle>
          
          {editingUser && (
            <EditUserProfile 
              user={editingUser} 
              onSuccess={handleEditDialogClose} 
              onCancel={handleEditDialogClose} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;