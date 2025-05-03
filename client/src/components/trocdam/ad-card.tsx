import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TrocAd, User } from "@shared/schema";
import { formatTimeAgo, getTrocCategoryLabel } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import FormattedText from "@/components/ui/formatted-text";

interface TrocAdCardProps {
  ad: TrocAd;
}

const TrocAdCard = ({ ad }: TrocAdCardProps) => {
  const { isAuthenticated } = useAuth();
  
  // Fetch user data for the ad creator
  const { data: user } = useQuery<User>({
    queryKey: [`/api/users/${ad.userId}`],
    enabled: !!ad.userId,
  });

  // Get initials for avatar fallback
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  return (
    <Card className="border border-gray-300 p-4 rounded-lg hover:border-[#FF5500] transition-colors">
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
            <Link href={`/artists/${user.id}`} className="text-sm hover:underline">
              {user.firstName} {user.lastName.charAt(0)}.
            </Link>
          ) : (
            <span className="text-sm">Utilisateur</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{formatTimeAgo(ad.createdAt || new Date())}</span>
          {isAuthenticated && user && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 px-2 text-sm flex items-center gap-1" 
              asChild
            >
              <Link href={`/messages/${user.id}`}>
                <MessageSquare className="h-4 w-4" /> Contacter
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TrocAdCard;