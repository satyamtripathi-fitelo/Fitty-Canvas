"use client";

import { LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error("Failed to sign in with Google");
      console.error(error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-[10px] border px-4 py-2 text-sm">
        <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-[10px] border px-3 py-2 text-sm sm:flex">
          <User className="h-4 w-4 text-primary" />
          <span className="max-w-[150px] truncate font-medium">
            {user.user_metadata?.full_name || user.email}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-[10px] border px-4 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className="flex items-center gap-2 rounded-[10px] border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
    >
      <LogIn className="h-4 w-4" />
      Sign in with Google
    </button>
  );
}
