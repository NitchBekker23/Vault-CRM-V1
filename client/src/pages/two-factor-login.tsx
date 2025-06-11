import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, Mail, Clock } from "lucide-react";

const twoFactorSchema = z.object({
  code: z.string().min(6, "Code must be 6 digits").max(6, "Code must be 6 digits"),
});

type TwoFactorForm = z.infer<typeof twoFactorSchema>;

export default function TwoFactorLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  const form = useForm<TwoFactorForm>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: "",
    },
  });

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // Request new code mutation
  const requestCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/2fa/request-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to send code");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Code Sent",
        description: "A new verification code has been sent to your email.",
      });
      setTimeLeft(300);
      setCanResend(false);
    },
    onError: (error) => {
      console.error("Request code error:", error);
      toast({
        title: "Failed to Send Code",
        description: "Unable to send verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Verify code mutation
  const verifyMutation = useMutation({
    mutationFn: async (data: TwoFactorForm) => {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: data.code,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Invalid verification code");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Two-factor authentication verified successfully.",
      });
      // Redirect to dashboard
      window.location.href = "/";
    },
    onError: (error) => {
      console.error("Verification error:", error);
      toast({
        title: "Verification Failed",
        description: "Invalid verification code. Please try again.",
        variant: "destructive",
      });
      form.reset();
    },
  });

  const onSubmit = (data: TwoFactorForm) => {
    verifyMutation.mutate(data);
  };

  const handleResendCode = () => {
    requestCodeMutation.mutate();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            We've sent a 6-digit verification code to your email. Enter it below to complete your login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 text-blue-800">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Check your email for the verification code</span>
                </div>
              </div>

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="Enter 6-digit code" 
                        className="text-center text-lg tracking-widest"
                        maxLength={6}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={verifyMutation.isPending || form.watch("code").length !== 6}
              >
                {verifyMutation.isPending ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="text-center space-y-2">
                {timeLeft > 0 ? (
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      Code expires in {formatTime(timeLeft)}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-red-600">
                    Code has expired
                  </div>
                )}
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={!canResend || requestCodeMutation.isPending}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {requestCodeMutation.isPending ? "Sending..." : "Resend Code"}
                </Button>
              </div>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => window.location.href = "/api/logout"}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Use Different Account
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}