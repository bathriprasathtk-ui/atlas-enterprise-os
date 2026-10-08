"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { signIn } from "@/lib/auth";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
  e: React.FormEvent<HTMLFormElement>
) {
  e.preventDefault();

  console.log("STEP 1: Button Clicked");

  setLoading(true);

  console.log("Email:", email);
  console.log("Password:", password);

  const { data, error } = await signIn(email, password);

  console.log("STEP 2");
  console.log("DATA:", data);
  console.log("ERROR:", error);

  setLoading(false);

  if (error) {
    alert(error.message);
    return;
  }

  console.log("STEP 3: Redirecting...");

  router.push("/workspace/dashboard");
}

  return (
    <Card>
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">
            Welcome Back 👋
          </h1>

          <p className="mt-2 text-slate-400">
            Sign in to Atlas Enterprise OS
          </p>
        </div>

        <div className="space-y-4">
          <Input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </div>
      </form>
    </Card>
  );
}