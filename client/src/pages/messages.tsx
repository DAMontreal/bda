import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Message } from "@shared/schema";
import MessageList from "@/components/messages/message-list";
import Conversation from "@/components/messages/conversation";



const Messages = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Fetch all user messages
  const { data: userMessages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    enabled: isAuthenticated && !!user,
  });

  // Get unique user IDs from messages
  const getUniqueUserIds = (): number[] => {
    if (!userMessages || !user) return [];
    
    const uniqueIds = new Set<number>();
    
    userMessages.forEach(message => {
      if (message.senderId !== user.id) {
        uniqueIds.add(message.senderId);
      }
      if (message.receiverId !== user.id) {
        uniqueIds.add(message.receiverId);
      }
    });
    
    return Array.from(uniqueIds);
  };

  // Fetch conversation users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users?approved=true"],
    enabled: isAuthenticated && !!userMessages,
  });

  // Filter users to only include those in conversations
  const conversationUsers = users?.filter(u => 
    getUniqueUserIds().includes(u.id) || selectedUserId === u.id
  );

  // Set page title
  useEffect(() => {
    document.title = "Messagerie | Bottin des artistes DAM";
  }, []);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Accès restreint</h1>
            <p className="text-gray-600 mb-6">
              Vous devez être connecté pour accéder à la messagerie.
            </p>
            <Button asChild>
              <a href="/login">Se connecter</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user?.isApproved) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Compte en attente d'approbation</h1>
            <p className="text-gray-600 mb-6">
              Vous pourrez accéder à la messagerie une fois que votre compte sera approuvé par un administrateur.
            </p>
            <Button asChild>
              <a href="/">Retour à l'accueil</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = authLoading || messagesLoading || usersLoading;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Messagerie</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex flex-col md:flex-row h-[600px]">
          {/* Message list */}
          <div className="w-full md:w-1/3 border-r border-gray-200">
            <MessageList
              users={conversationUsers || []}
              selectedUserId={selectedUserId}
              onSelectUser={setSelectedUserId}
              loading={isLoading}
            />
          </div>
          
          {/* Conversation */}
          <div className="w-full md:w-2/3 flex flex-col">
            {selectedUserId ? (
              <Conversation
                userId={selectedUserId}
                currentUser={user}
                loading={isLoading}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <div>
                  <p className="text-gray-500 mb-4">
                    Sélectionnez une conversation ou commencez-en une nouvelle
                  </p>
                  <Button asChild>
                    <a href="/artists">Parcourir les artistes</a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
