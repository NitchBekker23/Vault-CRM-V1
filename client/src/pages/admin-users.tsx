import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Users, UserCheck, UserX, Shield, Crown, Trash2 } from "lucide-react";
import Header from "@/components/header";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  role: "owner" | "admin" | "user";
  status: "pending" | "approved" | "denied" | "suspended";
  createdAt: string;
  lastLoginAt?: string;
}

interface AccountRequest {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phoneNumber?: string;
  message?: string;
  status: "pending" | "approved" | "denied";
  requestedAt: string;
  reviewedAt?: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [denialReason, setDenialReason] = useState("");
  const [showDenialDialog, setShowDenialDialog] = useState(false);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: accountRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/admin/account-requests"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const updateUserStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Updated",
        description: "User status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating user status:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update user status.",
        variant: "destructive",
      });
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error("Failed to update role");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role Updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating user role:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    },
  });

  const reviewRequest = useMutation({
    mutationFn: async ({ requestId, approved, denialReason }: { requestId: number; approved: boolean; denialReason?: string }) => {
      const response = await fetch(`/api/admin/account-requests/${requestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, denialReason }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to review request: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setSelectedRequest(null);
      setDenialReason("");
      setShowDenialDialog(false);
      toast({
        title: "Request Reviewed",
        description: "Account request has been processed successfully.",
      });
    },
    onError: (error) => {
      console.error("Error reviewing request:", error);
      toast({
        title: "Review Failed",
        description: "Failed to process account request.",
        variant: "destructive",
      });
    },
  });

  const handleApproveRequest = (request: AccountRequest) => {
    reviewRequest.mutate({ requestId: request.id, approved: true });
  };

  const handleDenyRequest = (request: AccountRequest) => {
    setSelectedRequest(request);
    setShowDenialDialog(true);
  };

  const confirmDenyRequest = () => {
    if (selectedRequest) {
      reviewRequest.mutate({ 
        requestId: selectedRequest.id, 
        approved: false, 
        denialReason: denialReason || undefined 
      });
    }
  };

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Deleted",
        description: "User has been permanently deleted from the system.",
      });
    },
    onError: (error) => {
      console.error("Error deleting user:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "default",
      approved: "default",
      denied: "destructive",
      suspended: "secondary",
    } as const;

    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      denied: "bg-red-100 text-red-800",
      suspended: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const pendingRequests = accountRequests.filter((req: AccountRequest) => req.status === "pending");

  return (
    <div className="space-y-6">
      <Header title="User Management" />

      {/* Account Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Pending Account Requests ({pendingRequests.length})
            </CardTitle>
            <CardDescription>
              Review and approve or deny new account requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request: AccountRequest) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">
                        {request.firstName} {request.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">{request.email}</p>
                      <p className="text-sm text-gray-600">{request.company}</p>
                      {request.phoneNumber && (
                        <p className="text-sm text-gray-600">{request.phoneNumber}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveRequest(request)}
                        disabled={reviewRequest.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDenyRequest(request)}
                        disabled={reviewRequest.isPending}
                      >
                        Deny
                      </Button>
                    </div>
                  </div>
                  {request.message && (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm font-medium text-gray-700">Message:</p>
                      <p className="text-sm text-gray-600">{request.message}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Requested on {new Date(request.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            System Users ({users.length})
          </CardTitle>
          <CardDescription>
            Manage user roles and access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-4">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{user.company}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <Select
                          value={user.role}
                          onValueChange={(role) => updateUserRole.mutate({ userId: user.id, role })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.status}
                        onValueChange={(status) => updateUserStatus.mutate({ userId: user.id, status })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="denied">Denied</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt 
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : "Never"
                      }
                    </TableCell>
                    <TableCell>
                      {(currentUser?.role === "owner" || currentUser?.role === "admin") && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteUser.mutate(user.id)}
                          disabled={deleteUser.isPending || user.id === currentUser?.id}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Denial Dialog */}
      <Dialog open={showDenialDialog} onOpenChange={setShowDenialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Account Request</DialogTitle>
            <DialogDescription>
              You are about to deny the account request for {selectedRequest?.firstName} {selectedRequest?.lastName}.
              Please provide a reason (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for denial (optional)..."
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDenialDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDenyRequest}>
              Confirm Denial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}