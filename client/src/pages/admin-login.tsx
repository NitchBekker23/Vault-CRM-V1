import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AdminLogin() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const adminLoginMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminKey: "admin123temp" }),
      });

      if (!response.ok) {
        throw new Error("Admin login failed");
      }

      return response.json();
    },
    onSuccess: () => {
      setStatus('success');
      // Redirect to dashboard after successful login
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: () => {
      setStatus('error');
    },
  });

  useEffect(() => {
    // Automatically attempt admin login when page loads
    adminLoginMutation.mutate();
  }, []);

  const handleRetry = () => {
    setStatus('loading');
    adminLoginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p>Logging you in as admin...</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-green-600 text-lg">✓</span>
              </div>
              <p className="text-green-600">Login successful! Redirecting...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-red-600 text-lg">✗</span>
              </div>
              <p className="text-red-600">Login failed. Please try again.</p>
              <Button onClick={handleRetry} className="w-full">
                Retry Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}