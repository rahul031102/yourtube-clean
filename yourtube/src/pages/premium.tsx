"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    amount: 0,
    description: "5 minutes watch limit",
    features: ["Watch up to 5 minutes of video"],
  },
  {
    id: "bronze",
    name: "Bronze",
    price: "₹10",
    amount: 1000,
    description: "7 minutes watch limit",
    features: ["7 minutes watch limit", "No advertising overhead"],
  },
  {
    id: "silver",
    name: "Silver",
    price: "₹50",
    amount: 5000,
    description: "10 minutes watch limit",
    features: ["10 minutes watch limit", "Priority support"],
  },
  {
    id: "gold",
    name: "Gold",
    price: "₹100",
    amount: 10000,
    description: "Unlimited watch time",
    features: ["Unlimited watch time", "Invoice email", "Best value"],
  },
];

const loadRazorpayScript = () => {
  return new Promise<boolean>((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(false);
    }
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(false);
    document.body.appendChild(script);
  });
};

export default function PremiumPage() {
  const { user, login } = useUser();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    loadRazorpayScript()
      .then(() => setScriptLoaded(true))
      .catch(() => setScriptLoaded(false));
  }, []);

  const handlePurchase = async (planId: string) => {
    if (!user) {
      setError("Please sign in to purchase a plan.");
      return;
    }
    if (!scriptLoaded) {
      setError("Unable to load payment gateway. Please try again.");
      return;
    }

    const plan = plans.find((item) => item.id === planId);
    if (!plan || plan.id === "free") {
      setError("Invalid plan selection.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const orderResponse = await axiosInstance.post("/payment/order", {
        userId: user._id,
        plan: planId,
      });

      const order = orderResponse.data.order;
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: `YourTube ${plan.name} Plan`,
        description: plan.description,
        order_id: order.id,
        prefill: {
          name: user.name || "",
          email: user.email || "",
        },
        theme: { color: "#2563eb" },
        handler: async (response: any) => {
          try {
            const verifyResponse = await axiosInstance.post("/payment/verify", {
              userId: user._id,
              plan: planId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            login(verifyResponse.data.user);
            setMessage(`Payment successful. Your plan is now ${plan.name}.`);
          } catch (verifyError: any) {
            setError(verifyError?.response?.data?.message || "Payment verification failed.");
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (orderError: any) {
      setError(orderError?.response?.data?.message || "Unable to create payment order.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Premium Plans</h1>
              <p className="mt-2 text-sm text-gray-600">
                Choose a plan to unlock higher watch limits and premium access.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Current plan</p>
              <p className="text-xl font-semibold text-blue-700">
                {user ? (user.plan === "gold" ? "Gold" : user.plan === "silver" ? "Silver" : user.plan === "bronze" ? "Bronze" : "Free") : "Not signed in"}
              </p>
              {user ? null : (
                <Link href="/">
                  <Button className="mt-2">Sign in to continue</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = user?.plan === plan.id || (user?.plan === "gold" && plan.id === "gold");
            return (
              <div key={plan.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{plan.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                  </div>
                  {isCurrent && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      Active
                    </span>
                  )}
                </div>
                <div className="mt-6">
                  <p className="text-4xl font-bold">{plan.price}</p>
                </div>
                <div className="mt-6 space-y-3 text-sm text-gray-700">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex items-center gap-2">
                      <span className="block h-2.5 w-2.5 rounded-full bg-blue-600" />
                      {feature}
                    </p>
                  ))}
                </div>
                <div className="mt-8">
                  {plan.id === "free" ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Current
                    </Button>
                  ) : isCurrent ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handlePurchase(plan.id)}
                      disabled={loading || !user}
                    >
                      {loading ? "Processing..." : `Subscribe ${plan.price}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {(message || error) && (
          <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            {message && <p className="text-green-600">{message}</p>}
            {error && <p className="text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
