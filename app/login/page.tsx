"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { z } from "zod";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const schema = z.object({
      email: z.string().email("Please enter a valid email address"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    });

    const validation = schema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      setIsLoading(false);
      return;
    }

    try {
      const res = await signIn("credentials", {
        email: validation.data.email,
        password: validation.data.password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password.");
        setIsLoading(false);
      } else {
        router.refresh();
        router.push("/app");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <Card className="border-border bg-surface w-full max-w-md shadow-2xl">
        <CardHeader className="flex flex-col items-center space-y-2 pb-6">
          <Logo size={36} className="mb-4" />
          <CardTitle className="text-text-primary text-xl font-bold tracking-tight">
            Sign in to CompensaIQIQ
          </CardTitle>
          <CardDescription className="text-text-muted text-center text-sm">
            Enter your HR Manager credentials to access the salary portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-3 text-xs leading-relaxed font-medium">
                {error}
              </div>
            )}

            <FormField
              label="Email Address"
              type="email"
              placeholder="hr.manager@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />

            <FormField
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              className="mt-2 w-full py-2.5"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
