import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TwoFactorModal({ isOpen, onClose, onSuccess }: TwoFactorModalProps) {
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const { toast } = useToast();

  const requestCode = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/2fa/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to send code");
      return response.json();
    },
    onSuccess: () => {
      setStep("verify");
      toast({
        title: "Code Sent",
        description: "A 6-digit code has been sent to your email.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send authentication code.",
        variant: "destructive",
      });
    },
  });

  const verifyCode = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/auth/2fa/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) throw new Error("Invalid code");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verified",
        description: "Two-factor authentication successful.",
      });
      onSuccess();
      handleClose();
    },
    onError: () => {
      toast({
        title: "Invalid Code",
        description: "The code you entered is invalid or expired.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setCode("");
    setStep("request");
    onClose();
  };

  const handleVerify = () => {
    if (code.length === 6) {
      verifyCode.mutate(code);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            {step === "request" 
              ? "We'll send a 6-digit code to your email for additional security."
              : "Enter the 6-digit code sent to your email address."
            }
          </DialogDescription>
        </DialogHeader>

        {step === "request" ? (
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Click below to receive an authentication code via email.
            </p>
            <Button 
              onClick={() => requestCode.mutate()} 
              disabled={requestCode.isPending}
              className="w-full"
            >
              {requestCode.isPending ? "Sending..." : "Send Code"}
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="code">Authentication Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>
            <Button 
              onClick={handleVerify}
              disabled={code.length !== 6 || verifyCode.isPending}
              className="w-full"
            >
              {verifyCode.isPending ? "Verifying..." : "Verify Code"}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}