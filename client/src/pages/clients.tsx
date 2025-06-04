import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Client } from "@shared/schema";

export default function Clients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: clientsData, isLoading: isLoadingClients, error } = useQuery<{
    clients: Client[];
    total: number;
  }>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [error, toast]);

  if (isLoading || !isAuthenticated || isLoadingClients) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="Client Management" />
      <div className="p-6">
        <Card>
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Client Database</h3>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                  <Input
                    type="text"
                    placeholder="Search clients..."
                    className="pl-10"
                  />
                </div>
                <Button>
                  <i className="fas fa-plus mr-2"></i>
                  Add Client
                </Button>
              </div>
            </div>
          </div>
          
          <CardContent className="p-0">
            {clientsData?.clients && clientsData.clients.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientsData.clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          {client.firstName} {client.lastName}
                        </TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>{client.phone || "-"}</TableCell>
                        <TableCell>
                          {new Date(client.createdAt!).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <i className="fas fa-eye"></i>
                            </Button>
                            <Button size="sm" variant="outline">
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button size="sm" variant="outline">
                              <i className="fas fa-shopping-bag"></i>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <i className="fas fa-users text-4xl text-slate-300 mb-4"></i>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No clients found</h3>
                <p className="text-slate-500 mb-4">Start by adding your first client to the database.</p>
                <Button>
                  <i className="fas fa-plus mr-2"></i>
                  Add First Client
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
