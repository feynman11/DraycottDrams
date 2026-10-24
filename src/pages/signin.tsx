import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Mail, MailCheck } from "lucide-react";
import { Input } from "@/components/ui/input";

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function SignInForm() {
  const search = useSearch({ from: "/signin" });
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const error = search.error ?? null;
  // Only allow same-origin relative callback paths.
  const callbackUrl =
    search.callbackUrl && search.callbackUrl.startsWith("/") && !search.callbackUrl.startsWith("//")
      ? search.callbackUrl
      : "/";
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  // Redirect if already signed in
  useEffect(() => {
    if (session) {
      navigate({ to: callbackUrl, replace: true });
    }
  }, [session, callbackUrl, navigate]);

  useEffect(() => {
    // If there's an error, show it briefly then allow retry
    if (error) {
      setIsLoading(false);
    }
  }, [error]);

  const handleSignIn = async () => {
    setIsLoading(true);
    const { error: signInError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: callbackUrl,
      errorCallbackURL: "/signin?error=OAuthSignin",
    });
    if (signInError) setIsLoading(false);
  };

  // Members without Google get an emailed link; it only goes to addresses the club knows.
  const handleEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailState("sending");
    const { error: linkError } = await authClient.signIn.magicLink({
      email: email.trim(),
      callbackURL: callbackUrl,
      errorCallbackURL: "/signin",
    });
    setEmailState(linkError ? "failed" : "sent");
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
      case "INVALID_TOKEN":
      case "EXPIRED_TOKEN":
        return "That sign-in link has expired or was already used. Ask for a new one below.";
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
  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Checking your session" />
      </div>
    );
  }

  // Don't render sign-in form if already authenticated (will redirect)
  if (session) {
    return null;
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* A soft amber glow behind the card, nothing else competing for attention */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm animate-rise-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/logo.png" alt="" className="mb-5 h-20 w-20 rounded-2xl object-cover shadow-lg ring-1 ring-border" />
          <h1 className="font-display text-display text-foreground">Draycott Drambusters</h1>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.25em] text-primary/80">Est. 2019</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg md:p-8">
          <h2 className="text-center text-lg font-semibold text-foreground">Welcome back</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Sign in to see your results, the drams sheet and the AI sommelier.
          </p>

          {error && (
            <div role="alert" className="mt-5 flex gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{getErrorMessage()}</p>
            </div>
          )}

          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            variant="secondary"
            size="lg"
            className="mt-6 w-full bg-foreground text-background hover:bg-foreground/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <GoogleMark />
                Continue with Google
              </>
            )}
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-subtle">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          {emailState === "sent" ? (
            <div role="status" className="flex gap-2.5 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-foreground">
              <MailCheck size={16} className="mt-0.5 shrink-0 text-primary" />
              <p>
                If <strong>{email.trim()}</strong> is on the club's list, a sign-in link is on its way. It expires in 15 minutes.{" "}
                <button type="button" className="text-primary underline underline-offset-2" onClick={() => setEmailState("idle")}>
                  Use a different email
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmailLink} className="space-y-3">
              <label htmlFor="signin-email" className="block text-sm text-muted-foreground">
                No Google account? We'll email you a sign-in link.
              </label>
              <Input
                id="signin-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailState === "failed" && (
                <p role="alert" className="text-sm text-destructive">The email couldn't be sent. Please try again in a minute.</p>
              )}
              <Button type="submit" variant="outline" size="lg" className="w-full" disabled={emailState === "sending" || !email.trim()}>
                {emailState === "sending" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
                Email me a sign-in link
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-subtle">
          The map, library and winners are open to everyone; member features need an invited account.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return <SignInForm />;
}
