import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";

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
    if (pendingAuth && pendingAuth.account && pendingAuth.account.phone) setPhone(pendingAuth.account.phone || "");
  }, [pendingAuth]);

  if (!pendingAuth) return null;

  const onVerify = async () => {
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
    if (!phone) return setError("Enter a valid phone number.");
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

  return (
    <Dialog open={Boolean(pendingAuth)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify your account</DialogTitle>
          <DialogDescription>
            We sent a one-time code to <strong>{pendingAuth.destination || pendingAuth.account.email}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {pendingAuth.requiresPhone && (
            <div className="space-y-2 mb-4">
              <p className="text-sm text-muted-foreground">No phone number found on your account. Save one to receive SMS OTPs.</p>
              {/* <div className="flex gap-2">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
                <Button onClick={onSavePhone} disabled={savingPhone}>{savingPhone ? "Saving..." : "Save"}</Button>
              </div> */}
              <div className="flex flex-col sm:flex-row gap-2">
  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
  <Button onClick={onSavePhone} disabled={savingPhone} className="sm:w-auto">{savingPhone ? "Saving..." : "Save"}</Button>
</div>
            </div>
          )}

          <div className="space-y-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter OTP" />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
{/* 
        <DialogFooter>
          <div className="flex items-center gap-2 w-full">
            <Button variant="outline" onClick={() => onResend(false)} disabled={resending}>{resending ? "Resending..." : "Resend"}</Button>
            <Button variant="ghost" onClick={() => onResend(true)} disabled={resending}>Send to email</Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => { cancelOtp(); }}>
                Cancel
              </Button>
              <Button onClick={onVerify} disabled={loading}>{loading ? "Verifying..." : "Verify"}</Button>
            </div>
          </div>
        </DialogFooter> */}
        <DialogFooter>
  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => onResend(false)} disabled={resending}>{resending ? "Resending..." : "Resend"}</Button>
      {pendingAuth.channel === "sms" && (
        <Button variant="ghost" size="sm" onClick={() => onResend(true)} disabled={resending}>Send to email</Button>
      )}
    </div>
    <div className="flex gap-2 sm:ml-auto">
      <Button variant="outline" className="flex-1 sm:flex-initial" onClick={() => { cancelOtp(); }}>
        Cancel
      </Button>
      <Button className="flex-1 sm:flex-initial" onClick={onVerify} disabled={loading}>{loading ? "Verifying..." : "Verify"}</Button>
    </div>
  </div>
</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
