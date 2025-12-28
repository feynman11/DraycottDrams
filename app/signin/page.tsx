"use client";

import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { GlassWater } from "lucide-react";

function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push(callbackUrl);
    }
  }, [status, session, callbackUrl, router]);

  useEffect(() => {
    // If there's an error, show it briefly then allow retry
    if (error) {
      setIsLoading(false);
    }
  }, [error]);

  const handleSignIn = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl });
  };

  const getErrorMessage = () => {
    switch (error) {
      case "OAuthSignin":
        return "There was a problem initiating the sign-in process. Please try again.";
      case "OAuthCallback":
        return "There was a problem completing the sign-in process. Please try again.";
      case "OAuthCreateAccount":
        return "Could not create your account. Please try again.";
      case "EmailCreateAccount":
        return "Could not create your account. Please try again.";
      case "Callback":
        return "There was a problem with the sign-in callback. Please try again.";
      case "OAuthAccountNotLinked":
        return "An account with this email already exists. Please sign in with the original provider.";
      case "EmailSignin":
        return "There was a problem sending the sign-in email. Please try again.";
      case "CredentialsSignin":
        return "Invalid credentials. Please check your details and try again.";
      case "SessionRequired":
        return "Please sign in to access this page.";
      default:
        if (error) {
          return "An error occurred during sign-in. Please try again.";
        }
        return null;
    }
  };

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-200">
        <div className="p-4 bg-amber-600/20 rounded-full border border-amber-600/50 mb-4">
          <GlassWater className="w-12 h-12 text-amber-500 animate-pulse" />
        </div>
      </div>
    );
  }

  // Don't render sign-in form if already authenticated (will redirect)
  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-200 p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-amber-600/20 rounded-full border border-amber-600/50 mb-4">
            <GlassWater className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-amber-50 tracking-wide mb-2">
            Draycott Drambusters
          </h1>
          <p className="text-sm text-amber-500/80 uppercase tracking-widest">
            Est. 2019
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md p-8 rounded-xl border border-slate-700/50 shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-100 mb-2 text-center">
            Sign In
          </h2>
          <p className="text-slate-400 text-center mb-6">
            Sign in with your Google account to access the whisky club
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
              <p className="text-red-400 text-sm">{getErrorMessage()}</p>
            </div>
          )}

          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full bg-amber-700 hover:bg-amber-600 text-white shadow-amber-900/20 shadow-lg h-12 text-base font-medium"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SignInLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-200">
      <div className="p-4 bg-amber-600/20 rounded-full border border-amber-600/50 mb-4">
        <GlassWater className="w-12 h-12 text-amber-500 animate-pulse" />
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInForm />
    </Suspense>
  );
}

