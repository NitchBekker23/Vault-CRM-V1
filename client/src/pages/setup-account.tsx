import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle } from "lucide-react";

const setupAccountSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  twoFactorMethod: z.enum(["email", "sms"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetupAccountForm = z.infer<typeof setupAccountSchema>;

export default function SetupAccount() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/setup-account");
  const { toast } = useToast();
  const [tokenStatus, setTokenStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [accountData, setAccountData] = useState<any>(null);

  const token = new URLSearchParams(window.location.search).get("token");

  const form = useForm<SetupAccountForm>({
    resolver: zodResolver(setupAccountSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      twoFactorMethod: "email",
    },
  });

  // Verify token on component mount
  useEffect(() => {
    if (!token) {
      setTokenStatus("invalid");
      return;
    }

    fetch(`/api/auth/verify-setup-token?token=${token}`)
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          setAccountData(data);
          setTokenStatus("valid");
        } else {
          setTokenStatus("invalid");
        }
      })
      .catch(() => {
        setTokenStatus("invalid");
      });
  }, [token]);

  const setupMutation = useMutation({
    mutationFn: async (data: SetupAccountForm) => {
      const response = await fetch("/api/auth/complete-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: data.password,
          twoFactorMethod: data.twoFactorMethod,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to complete setup");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Setup Complete",
        description: "Your account has been set up successfully. You can now sign in.",
      });
      // Redirect to login
      window.location.href = "/api/login";
    },
    onError: (error) => {
      console.error("Account setup error:", error);
      toast({
        title: "Setup Failed",
        description: "Failed to complete account setup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SetupAccountForm) => {
    setupMutation.mutate(data);
  };

  if (tokenStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Verifying setup link...</p>
        </div>
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">Invalid Setup Link</CardTitle>
            <CardDescription>
              This account setup link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              The setup link may have expired or already been used. Please contact an administrator to request a new setup link.
            </p>
            <Button
              onClick={() => navigate("/")}
              className="w-full"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Complete Account Setup</CardTitle>
          <CardDescription>
            Welcome {accountData?.firstName} {accountData?.lastName}! Complete your account setup to access the inventory management system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm">
                  <strong>Email:</strong> {accountData?.email}
                </div>
                <div className="text-sm">
                  <strong>Company:</strong> {accountData?.company}
                </div>
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="twoFactorMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Two-Factor Authentication Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select authentication method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS (coming soon)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={setupMutation.isPending}
              >
                {setupMutation.isPending ? "Setting up..." : "Complete Setup"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}