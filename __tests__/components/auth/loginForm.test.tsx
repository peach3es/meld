import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- hoisted mocks ---------------------------------------------------------
const { toast, signInWithPassword } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
  signInWithPassword: vi.fn(),
}));

const navFns = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navFns,
  useSearchParams: () => new URLSearchParams("redirect=/jars/demo"),
}));

vi.mock("sonner", () => ({ toast }));

vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowser: () => ({ auth: { signInWithPassword } }),
}));

import LoginForm from "@/components/auth/loginForm";

describe("<LoginForm />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates inputs before attempting sign-in", async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/enter a valid email/i)
    ).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("submits credentials and navigates on success", async () => {
    signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), {
      target: { value: "me@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "hunter2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "me@example.com",
        password: "hunter2",
      });
      expect(toast.success).toHaveBeenCalledWith("Signed in");
      expect(navFns.replace).toHaveBeenCalledWith("/jars/demo");
      expect(navFns.refresh).toHaveBeenCalled();
    });
  });

  it("surfaces auth errors to the user", async () => {
    signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: "bad creds" },
    });

    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), {
      target: { value: "me@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "badpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Sign-in failed", {
        description: "bad creds",
      });
      expect(navFns.replace).not.toHaveBeenCalled();
    });
  });
});
