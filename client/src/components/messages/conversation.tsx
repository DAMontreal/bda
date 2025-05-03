import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Message } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatTimeAgo } from "@/lib/utils";
import FormattedText from "@/components/ui/formatted-text";

interface ConversationProps {
  userId: number;
  currentUser: User;
  loading?: boolean;
}

const Conversation = ({ userId, currentUser, loading }: ConversationProps) => {
  const [messageText, setMessageText] = useState("");
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: [`/api/messages/conversation/${currentUser.id}/${userId}`],
    enabled: !!userId && !!currentUser,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/messages", {
        senderId: currentUser.id,
        receiverId: userId,
        content,
      });
    },
    onSuccess: async () => {
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/messages/conversation/${currentUser.id}/${userId}`]
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      
      // Clear input field
      setMessageText("");
      
      // Focus textarea for next message
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'envoi du message",
      });
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [userId]);

  // Get initials for avatar fallback
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  // Handle message send
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText);
  };

  // Mutation pour marquer un message comme lu
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("PATCH", `/api/messages/${messageId}/read`);
    }
  });

  // Marquer les messages non lus comme lus lorsqu'ils sont affichés
  useEffect(() => {
    if (messages && messages.length > 0) {
      // Filtrer uniquement les messages non lus où l'utilisateur courant est le destinataire
      const unreadMessages = messages.filter(
        message => !message.isRead && message.receiverId === currentUser.id
      );
      
      // Marquer chaque message non lu comme lu
      unreadMessages.forEach(message => {
        markAsReadMutation.mutate(message.id);
      });
      
      if (unreadMessages.length > 0) {
        // Invalider les requêtes pour mettre à jour la liste des messages
        queryClient.invalidateQueries({
          queryKey: ['/api/messages']
        });
      }
    }
  }, [messages, currentUser, markAsReadMutation]);

  // Loading state
  if (loading || userLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center animate-pulse">
          <div className="h-10 w-10 bg-gray-200 rounded-full mr-3"></div>
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`flex items-start mb-4 ${
                i % 2 === 0 ? "justify-start" : "justify-end"
              }`}
            >
              {i % 2 === 0 && (
                <div className="h-8 w-8 bg-gray-200 rounded-full mr-2"></div>
              )}
              <div
                className={`rounded-lg p-3 max-w-xs ${
                  i % 2 === 0
                    ? "bg-gray-200"
                    : "bg-gray-200 ml-auto"
                }`}
              >
                <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Utilisateur non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center">
        <Avatar className="h-10 w-10 mr-3">
          <AvatarImage src={user.profileImage || ""} alt={`${user.firstName} ${user.lastName}`} />
          <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{user.firstName} {user.lastName}</div>
          <div className="text-sm text-gray-500">
            {user.discipline || "Artiste"}
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {!messagesLoading && (!messages || messages.length === 0) ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="p-6 max-w-md">
              <p className="mb-2 text-gray-700 font-medium">Démarrer une conversation</p>
              <p className="text-gray-500 text-sm">
                Envoyez un message à {user.firstName} pour commencer à discuter
              </p>
            </div>
          </div>
        ) : (
          messages?.map((message) => {
            const isCurrentUser = message.senderId === currentUser.id;
            const sender = isCurrentUser ? currentUser : user;
            
            return (
              <div
                key={message.id}
                className={`flex items-start mb-4 ${
                  isCurrentUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isCurrentUser && (
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src={sender.profileImage || ""} alt={`${sender.firstName} ${sender.lastName}`} />
                    <AvatarFallback>{getInitials(sender.firstName, sender.lastName)}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-lg p-3 max-w-xs ${
                    isCurrentUser
                      ? "bg-[#FF5500] text-white ml-auto"
                      : "bg-gray-100"
                  }`}
                >
                  <FormattedText text={message.content} />
                  <span
                    className={`text-xs mt-1 block ${
                      isCurrentUser ? "text-white/70 text-right" : "text-gray-500"
                    }`}
                  >
                    {formatTimeAgo(message.createdAt || new Date())}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="p-4 border-t flex items-start">
        <Textarea
          ref={textareaRef}
          placeholder="Écrivez votre message..."
          className="mr-2 min-h-[60px] resize-none"
          value={messageText}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageText(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (messageText.trim()) {
                sendMessageMutation.mutate(messageText);
              }
            }
          }}
        />
        <Button 
          type="submit" 
          variant="default" 
          className="bg-[#FF5500] self-end" 
          disabled={!messageText.trim() || sendMessageMutation.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default Conversation;