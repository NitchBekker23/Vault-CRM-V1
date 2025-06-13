import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Client {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  profileImageUrl?: string;
  vipStatus?: boolean;
  totalPurchases?: number;
  lastPurchase?: string;
}

interface TopClientsProps {
  clients: Client[];
  title?: string;
  showViewAll?: boolean;
}

function getClientDisplayName(client: Client): string {
  if (client.firstName && client.lastName) {
    return `${client.firstName} ${client.lastName}`;
  }
  return client.email.split('@')[0];
}

function getClientInitials(client: Client): string {
  if (client.firstName && client.lastName) {
    return `${client.firstName[0]}${client.lastName[0]}`;
  }
  const emailName = client.email.split('@')[0];
  return emailName.slice(0, 2).toUpperCase();
}

function getClientRank(index: number): { label: string; color: string } {
  switch (index) {
    case 0:
      return { label: "#1", color: "bg-yellow-500" };
    case 1:
      return { label: "#2", color: "bg-slate-400" };
    case 2:
      return { label: "#3", color: "bg-amber-600" };
    default:
      return { label: `#${index + 1}`, color: "bg-slate-300" };
  }
}

export default function TopClients({ 
  clients, 
  title = "Top Clients",
  showViewAll = true 
}: TopClientsProps) {
  // Sort clients by total purchases (mock data for now)
  const sortedClients = [...clients].slice(0, 5);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {showViewAll && (
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            View All
          </Button>
        )}
      </div>
      
      <div className="space-y-4">
        {sortedClients.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <i className="fas fa-users text-2xl mb-2"></i>
            <p>No clients yet</p>
          </div>
        ) : (
          sortedClients.map((client, index) => {
            const rank = getClientRank(index);
            return (
              <div key={client.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                {/* Rank Badge */}
                <div className={`w-8 h-8 ${rank.color} rounded-full flex items-center justify-center`}>
                  <span className="text-white text-xs font-bold">{rank.label}</span>
                </div>
                
                {/* Client Avatar */}
                <div className="flex-shrink-0">
                  {client.profileImageUrl ? (
                    <img
                      src={client.profileImageUrl}
                      alt={getClientDisplayName(client)}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {getClientInitials(client)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Client Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-medium text-slate-900 truncate">
                      {getClientDisplayName(client)}
                    </p>
                    {client.vipStatus && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                        VIP
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{client.email}</p>
                  {client.totalPurchases && (
                    <p className="text-xs text-slate-400">
                      {client.totalPurchases} purchases
                    </p>
                  )}
                </div>
                
                {/* Action Button */}
                <div className="flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <i className="fas fa-ellipsis-h text-slate-400"></i>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}