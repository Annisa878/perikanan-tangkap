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
      // Tambahkan data role dan username ke metadata auth user
      data: {
        username: username,
        role: "Admin Kab/Kota",
      }
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
      role: "Admin Kab/Kota",
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
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    console.error("Login error:", authError?.message);
    return encodedRedirect("error", "/sign-in", "Invalid email or password");
  }

  // Ambil informasi role dari database
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    // Tambahkan logging untuk melihat error dari database
    console.error("Failed to get user profile:", profileError?.message);
    // Redirect dengan pesan error yang lebih spesifik
    return encodedRedirect("error", "/sign-in", "Could not find user profile. Please contact support.");
  }

  // Debugging: Log role yang didapat dari database untuk memastikan nilainya benar
  console.log(`User ${email} logged in with role: ${profile.role}`);

  switch (profile.role) {
    case "Admin Provinsi":
      return redirect("/pages/admin");
    case "Kepala Bidang":
      return redirect("/pages/kepala-bidang");
    case "Kepala Dinas":
      return redirect("/pages/kepala-dinas");
    case "Admin Kab/Kota":
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
