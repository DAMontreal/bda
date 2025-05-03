import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Message } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

/**
 * Composant qui vérifie périodiquement les nouveaux messages et affiche une notification
 */
const MessageNotification: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [lastMessageCount, setLastMessageCount] = useState<number>(0);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);

  // Récupération des messages
  const { data: messages } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
    enabled: isAuthenticated && !!user,
    refetchInterval: 15000, // Vérifie les nouveaux messages toutes les 15 secondes
  });

  // Filtrer les messages non lus où l'utilisateur est le destinataire
  const unreadMessages = messages?.filter(
    (message) => message.receiverId === user?.id && !message.isRead
  );

  useEffect(() => {
    // Ignorer la première charge pour éviter de notifier les messages existants
    if (initialLoad) {
      if (unreadMessages) {
        setLastMessageCount(unreadMessages.length);
        setInitialLoad(false);
      }
      return;
    }

    // Vérifier s'il y a de nouveaux messages
    if (unreadMessages && unreadMessages.length > lastMessageCount) {
      const newMessagesCount = unreadMessages.length - lastMessageCount;
      
      // Afficher une notification
      toast({
        title: `${newMessagesCount} nouveau${newMessagesCount > 1 ? 'x' : ''} message${newMessagesCount > 1 ? 's' : ''}`,
        description: 'Consultez vos messages pour les voir',
        variant: 'default',
      });
      
      // Mettre à jour le compteur
      setLastMessageCount(unreadMessages.length);
    }
  }, [unreadMessages, lastMessageCount, initialLoad, toast]);

  return null; // Ce composant ne rend rien visuellement
};

export default MessageNotification;