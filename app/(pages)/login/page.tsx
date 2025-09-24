// app/login/page.tsx
import LoginForm from "@/components/auth/loginForm";

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-xl border bg-background p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use your email and password.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
