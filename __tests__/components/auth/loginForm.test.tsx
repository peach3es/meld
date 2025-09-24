import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- hoisted mocks ---
const { toast, signInWithPassword } = vi.hoisted(() => {
  return {
    toast: { success: vi.fn(), error: vi.fn() },
    signInWithPassword: vi.fn(),
  };
});

// next/navigation
const navFns = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navFns,
  useSearchParams: () => new URLSearchParams("redirect=/jars/abc"),
}));

// sonner (use the hoisted toast)
vi.mock("sonner", () => ({ toast }));

// supabase browser singleton (uses hoisted signInWithPassword)
vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowser: () => ({ auth: { signInWithPassword } }),
}));

import LoginForm from "@/components/auth/loginForm";
import { toast as mockedToast } from "sonner"; // so we can assert

describe("<LoginForm />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates fields and shows messages", async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // Our zod schema uses a custom email message:
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    // And sign-in should NOT have been attempted
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("submits credentials and navigates on success", async () => {
    signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), {
      target: { value: "me@site.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/•+/), {
      target: { value: "hunter2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "me@site.com",
        password: "hunter2",
      });
      expect(mockedToast.success).toHaveBeenCalledWith("Signed in");
      expect(navFns.replace).toHaveBeenCalledWith("/jars/abc");
      expect(navFns.refresh).toHaveBeenCalled();
    });
  });

  it("shows toast.error on auth failure", async () => {
    signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid login" },
    });

    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), {
      target: { value: "me@site.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/•+/), {
      target: { value: "badpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith("Sign-in failed", {
        description: "Invalid login",
      });
      expect(navFns.replace).not.toHaveBeenCalled();
    });
  });
});
