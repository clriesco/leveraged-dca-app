"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider component that wraps the app
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session and refresh if needed
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[AuthContext] Error getting session:", error);
          setLoading(false);
          return;
        }

        if (session) {
          setUser(session.user);
          if (session.access_token) {
            localStorage.setItem("supabase_token", session.access_token);
            console.log("[AuthContext] Token saved to localStorage");
          }
        } else {
          setUser(null);
          localStorage.removeItem("supabase_token");
        }
      } catch (err) {
        console.error("[AuthContext] Error initializing auth:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes (including token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] Auth state changed: ${event}`);
      
      if (session) {
        setUser(session.user);
        if (session.access_token) {
          localStorage.setItem("supabase_token", session.access_token);
          console.log("[AuthContext] Token updated in localStorage");
        }
      } else {
        setUser(null);
        localStorage.removeItem("supabase_token");
      }

      // Handle token refresh events
      if (event === "TOKEN_REFRESHED" && session?.access_token) {
        localStorage.setItem("supabase_token", session.access_token);
        console.log("[AuthContext] Token refreshed and saved");
      }
    });

    // Periodically refresh session to ensure token is up to date
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const currentToken = localStorage.getItem("supabase_token");
          if (currentToken !== session.access_token) {
            localStorage.setItem("supabase_token", session.access_token);
            console.log("[AuthContext] Token refreshed via interval");
          }
        }
      } catch (err) {
        console.error("[AuthContext] Error refreshing session:", err);
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const signIn = async (email: string) => {
    // Use window.location.origin to automatically detect localhost or production
    // This ensures magic links redirect to the correct environment
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    console.log(`[AuthContext] Sending magic link with redirect: ${redirectUrl}`);
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error(`[AuthContext] Error sending magic link:`, error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    localStorage.removeItem("supabase_token");
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
