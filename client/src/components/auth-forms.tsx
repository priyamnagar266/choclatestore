import React, { useState } from "react";
import { useAuth } from "./auth-context";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export function SignupForm({ onSuccess }: { onSuccess?: (user: any) => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      toast({
        title: "Account Created!",
        description: "Your account has been successfully created.",
        variant: "default",
      });
      onSuccess?.(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 mt-10 border border-amber-200">
      <h2 className="text-2xl font-bold mb-6 text-amber-800 text-center">Sign Up</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          required
          className="w-full px-4 py-2 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          required
          className="w-full px-4 py-2 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          required
          className="w-full px-4 py-2 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        {error && <div className="text-red-500 text-center">{error}</div>}
        <button type="submit" className="w-full bg-amber-800 text-white py-2 rounded hover:bg-green-700 transition-colors" disabled={loading}>
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-700">Already have an account?<a href="/login" className="ml-1 font-semibold text-purple-700 hover:underline focus:outline-none focus:ring-2 focus:ring-purple-500 rounded">Login</a></p>
    </div>
  );
}

export function LoginForm({ onSuccess }: { onSuccess?: (user: any) => void }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      login(data);
      toast({
        title: "Login Successful!",
        description: "Welcome back! You are now logged in.",
        variant: "default",
      });
      setLocation("/");
      onSuccess?.(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 mt-10 border border-amber-200">
      <h2 className="text-2xl font-bold mb-6 text-amber-800 text-center">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          required
          className="w-full px-4 py-2 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          required
          className="w-full px-4 py-2 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        {error && <div className="text-red-500 text-center">{error}</div>}
        <button type="submit" className="w-full bg-amber-800 text-white py-2 rounded hover:bg-green-700 transition-colors" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-700">Don't have an account?<a href="/signup" className="ml-1 font-semibold text-purple-700 hover:underline focus:outline-none focus:ring-2 focus:ring-purple-500 rounded">Signup</a></p>
    </div>
  );
}
