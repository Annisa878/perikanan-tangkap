"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const username = formData.get("username")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password || !username) {
    return encodedRedirect("error", "/sign-up", "Email, username, and password are required");
  }

  // Sign up user with Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error("Auth signup error:", error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  }

  if (!data.user) {
    return encodedRedirect("error", "/sign-up", "User registration failed.");
  }

  const domisili = formData.get("domisili")?.toString();

  // Masukkan data user ke dalam database
  const { error: insertError } = await supabase.from("users").insert([
    {
      id: data.user.id,
      email: email,
      username: username,
      role: "user",
      domisili: domisili
    },
  ]);

  if (insertError) {
    console.error("Database insertion error:", insertError.message);
    return encodedRedirect("error", "/sign-up", "Failed to create user profile");
  }

  return encodedRedirect(
    "success",
    "/sign-in",
    "Thanks for signing up! Please check your email for a verification link."
  );
};

export const signInAction = async (formData: FormData) => {
  "use server";
  
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();
  
  // Coba login dengan email dan password
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    console.error("Login error:", error?.message);
    return encodedRedirect("error", "/sign-in", "Invalid email or password");
  }

  // Simpan sesi autentikasi di cookie
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    console.error("Session error:", sessionError?.message);
    return encodedRedirect("error", "/sign-in", "Failed to store session.");
  }

  // Debugging: Pastikan session tersimpan
  console.log("User ID:", data.user.id);
  console.log("Session Data:", sessionData.session);

  // Ambil informasi role dari database
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    return encodedRedirect("error", "/sign-in", "Failed to get user role");
  }

  switch (profile.role) {
    case "admin":
      return redirect("/pages/admin");
    case "kepala bidang":
      return redirect("/pages/kepala-bidang");
    case "kepala dinas":
      return redirect("/pages/kepala-dinas");
    case "user":
    default:
      return redirect("/pages/user");
  }
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error("Reset password error:", error.message);
    return encodedRedirect("error", "/forgot-password", "Could not reset password");
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password."
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect("error", "/protected/reset-password", "Password and confirm password are required");
  }

  if (password !== confirmPassword) {
    return encodedRedirect("error", "/protected/reset-password", "Passwords do not match");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return encodedRedirect("error", "/protected/reset-password", "Password update failed");
  }

  return encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};
