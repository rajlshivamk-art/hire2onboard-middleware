"use client";

import { useState } from "react";
import { api } from "../lib/api";

export default function SetPasswordPage() {

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pwd)) return "Must contain at least one uppercase letter";
    if (!/[0-9]/.test(pwd)) return "Must contain at least one number";
    return "";
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid or missing token");
      return;
    }

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      await api.auth.setPassword(token, password);

      setSuccess("Password set successfully. Redirecting...");

      setTimeout(() => {
        window.location.href = "/";
      }, 2000);

    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-white text-xl mb-4">Set Password</h2>

        <input
          type="password"
          placeholder="New Password"
          className="w-full mb-3 p-2 bg-black text-white border"
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          className="w-full mb-3 p-2 bg-black text-white border"
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && <p className="text-red-400">{error}</p>}
        {success && <p className="text-green-400">{success}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 p-2 mt-3 text-white"
        >
          {loading ? "Setting..." : "Set Password"}
        </button>
      </div>
    </div>
  );
}