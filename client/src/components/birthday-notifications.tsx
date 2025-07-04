import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Gift, Bell, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BirthdayClient {
  id: number;
  fullName: string;
  birthday: string;
  email?: string;
  phoneNumber?: string;
}

export function BirthdayNotifications() {
  const { toast } = useToast();

  // Query to get today's birthdays
  const { data: birthdayClients = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/birthdays/today"],
    queryFn: () => apiRequest("/api/birthdays/today"),
    staleTime: 60 * 1000, // 1 minute
  });



  const formatBirthday = (birthday: string) => {
    const date = new Date(birthday);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-orange-500" />
            <CardTitle>Client Birthdays Today</CardTitle>
          </div>
          {birthdayClients.length > 0 && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Auto-Notified</span>
            </div>
          )}
        </div>
        <CardDescription>
          {birthdayClients.length > 0 
            ? "All team members have been automatically notified about today's client birthdays"
            : "System automatically checks for birthdays and notifies all team members"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading birthday information...</div>
        ) : birthdayClients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No client birthdays today</p>
            <p className="text-sm">Check back tomorrow for birthday notifications</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {birthdayClients.length} Birthday{birthdayClients.length !== 1 ? 's' : ''} Today
              </Badge>
            </div>
            
            <div className="grid gap-3">
              {birthdayClients.map((client: BirthdayClient) => (
                <div 
                  key={client.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center">
                      <Gift className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{client.fullName}</h4>
                      <p className="text-sm text-gray-600">
                        Birthday: {formatBirthday(client.birthday)}
                      </p>
                      {client.email && (
                        <p className="text-xs text-gray-500">{client.email}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge className="bg-orange-500 hover:bg-orange-600">
                      🎂 Today
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-900">Automatic Birthday Notifications</p>
                  <p className="text-green-700">
                    All team members have been automatically notified about today's client birthdays. 
                    Each user will receive a notification to reach out and wish the client well.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}