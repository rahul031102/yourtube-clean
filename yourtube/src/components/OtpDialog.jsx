import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";
import { Mail, Smartphone, KeyRound, AlertCircle, Phone } from "lucide-react";

export default function OtpDialog() {
  const { pendingAuth, verifyOtp, resendOtp, savePhoneForPending, cancelOtp } = useUser();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!pendingAuth) {
      setCode("");
      setError(null);
    }
    if (pendingAuth?.account?.phone) {
      setPhone(pendingAuth.account.phone);
    }
  }, [pendingAuth]);

  if (!pendingAuth) return null;

  const onVerify = async () => {
    if (!code.trim()) return setError("Please enter the verification code.");
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(code);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Verification failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async (forceEmail = false) => {
    setResending(true);
    setError(null);
    try {
      await resendOtp({ forceEmail });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Unable to resend OTP";
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  const onSavePhone = async () => {
    if (!phone.trim()) return setError("Please enter a valid phone number.");
    setSavingPhone(true);
    setError(null);
    try {
      await savePhoneForPending(phone.trim());
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Unable to save phone";
      setError(msg);
    } finally {
      setSavingPhone(false);
    }
  };

  const isEmailChannel = pendingAuth.channel === "email";
  const requiresPhoneInput = pendingAuth.requiresPhone && !pendingAuth.destination;

  return (
    <Dialog open={Boolean(pendingAuth)} onOpenChange={(open) => { if (!open) cancelOtp(); }}>
      <DialogContent className="max-w-md rounded-2xl border bg-card text-card-foreground p-6 shadow-2xl transition-all duration-300">
        
        {requiresPhoneInput ? (
          /* Phase 1: Register Phone Number (Only for non-South Indian accounts without a registered number) */
          <>
            <DialogHeader className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                <Phone className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-semibold tracking-tight">Add Phone Number</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground max-w-[320px]">
                Accounts outside South Indian states require a registered mobile number to receive SMS verification codes.
              </DialogDescription>
            </DialogHeader>

            <div className="my-6 space-y-4">
              <div className="relative">
                <Input
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="+91 XXXXXXXXXX"
                  className="bg-muted/50 border-2 border-muted focus-visible:border-primary focus-visible:ring-0 rounded-xl h-12 text-center text-lg font-medium"
                />
              </div>
              {error && (
                <div className="flex items-center justify-center gap-1.5 text-sm text-destructive animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="flex-1 rounded-lg"
                onClick={cancelOtp}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                onClick={onSavePhone}
                disabled={savingPhone}
              >
                {savingPhone ? "Sending..." : "Send OTP"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* Phase 2: Enter Verification Code (Directly for South Indian accounts, or after phone registration) */
          <>
            <DialogHeader className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                {isEmailChannel ? (
                  <Mail className="w-6 h-6" />
                ) : (
                  <Smartphone className="w-6 h-6" />
                )}
              </div>
              <DialogTitle className="text-xl font-semibold tracking-tight">Verify Your Account</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground max-w-[280px]">
                We sent a one-time code to <strong className="text-foreground">{pendingAuth.destination}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="my-6 space-y-4">
              <div className="relative flex flex-col items-center">
                <div className="relative w-full max-w-[260px]">
                  <Input
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      if (error) setError(null);
                    }}
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    className="w-full text-center text-2xl font-bold tracking-[0.6em] h-14 bg-muted/50 border-2 border-muted focus-visible:border-primary focus-visible:ring-0 rounded-xl"
                  />
                  <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 pointer-events-none" />
                </div>
                {error && (
                  <div className="flex items-center gap-1.5 mt-3 text-sm text-destructive animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="sm:justify-between items-center border-t pt-4 gap-3 sm:gap-0">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onResend(false)}
                  disabled={resending}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {resending ? "Resending..." : "Resend code"}
                </Button>
                {pendingAuth.channel === "sms" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResend(true)}
                    disabled={resending}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Send to email
                  </Button>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-initial rounded-lg"
                  onClick={cancelOtp}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 sm:flex-initial rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  onClick={onVerify}
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
