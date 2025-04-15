import { useState, useRef, useEffect } from "react";
import { User } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface MessageListProps {
  users: User[];
  selectedUserId: number | null;
  onSelectUser: (userId: number) => void;
  loading?: boolean;
}

const MessageList = ({ users, selectedUserId, onSelectUser, loading }: MessageListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  // Focus search input on mount
  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  // Get initials for avatar fallback
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  // Render skeleton loader during loading
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="relative w-full">
            <div className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center p-3 rounded-md mb-2 animate-pulse"
            >
              <div className="h-10 w-10 bg-gray-200 rounded-full mr-3"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            ref={searchRef}
            type="text"
            placeholder="Rechercher..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`flex items-center p-3 rounded-md mb-2 cursor-pointer hover:bg-gray-100 transition-colors ${
                selectedUserId === user.id ? "bg-gray-100" : ""
              }`}
              onClick={() => onSelectUser(user.id)}
            >
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage src={user.profileImage || ""} alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback>
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{user.firstName} {user.lastName}</div>
                <div className="text-sm text-gray-500">
                  {user.discipline || "Artiste"}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 p-4">
            {searchTerm ? "Aucun utilisateur trouvé" : "Aucune conversation"}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageList;