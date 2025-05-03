import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Message } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';

/**
 * Composant qui affiche un badge avec le nombre de messages non lus
 */
const MessageBadge: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // Récupération des messages uniquement si l'utilisateur est connecté
  const { data: messages } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
    enabled: isAuthenticated && !!user,
    refetchInterval: 15000, // Vérifie les nouveaux messages toutes les 15 secondes
  });

  // Filtrer les messages non lus où l'utilisateur est le destinataire
  const unreadMessages = messages?.filter(
    (message) => message.receiverId === user?.id && !message.isRead
  );

  // Ne rien afficher s'il n'y a pas de messages non lus
  if (!unreadMessages || unreadMessages.length === 0) {
    return null;
  }

  return (
    <Badge variant="destructive" className="ml-1 bg-[#FF5500]">
      {unreadMessages.length > 99 ? '99+' : unreadMessages.length}
    </Badge>
  );
};

export default MessageBadge;