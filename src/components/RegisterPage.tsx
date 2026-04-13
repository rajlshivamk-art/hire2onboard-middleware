import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "../lib/api";

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    companyName: z.string().min(1, "Company name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterPageProps {
  onRegisterSuccess: () => void;
}

export function RegisterPage({ onRegisterSuccess }: RegisterPageProps) {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError("");
    try {
      await api.auth.registerCompany({
        admin_name: data.name,
        email: data.email,
        password: data.password,
        company_name: data.companyName,
      });
      onRegisterSuccess();
    } catch (err: any) {
      if (err.response?.data?.detail) setError(err.response.data.detail);
      else if (err.message) setError(err.message);
      else setError("Registration failed");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.32)",
    paddingBottom: "7px",
    paddingRight: "26px",
    color: "white",
    fontSize: "18px",
    fontFamily: "Inter, sans-serif",
    outline: "none",
    WebkitTextFillColor: "white",
    WebkitBoxShadow: "0 0 0px 1000px transparent inset",
    transition: "background-color 5000s ease-in-out 0s",
    caretColor: "white",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "rgba(255,255,255,0.52)",
    fontSize: "14px",
    fontWeight: 500,
    marginBottom: "6px",
    fontFamily: "Inter, sans-serif",
    letterSpacing: "0.055em",
    textTransform: "uppercase",
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: "16px",
  };

  const errorStyle: React.CSSProperties = {
    color: "#fca5a5",
    fontSize: "12px",
    marginTop: "4px",
    fontFamily: "Inter, sans-serif",
  };

  const eyeBtnStyle: React.CSSProperties = {
    position: "absolute",
    right: 0,
    top: "1px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "rgba(255,255,255,0.42)",
    padding: 0,
    display: "flex",
    alignItems: "center",
    lineHeight: 1,
  };

  const EyeIcon = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.94 10.94 0 0112 20C7 20 2.73 16.39 1 12a10.94 10.94 0 012.06-3.94M9.9 4.24A9.12 9.12 0 0112 4c5 0 9.27 3.61 11 8a10.94 10.94 0 01-1.42 2.58M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        input, input:focus, input:active, input:hover {
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
          -webkit-text-fill-color: white !important;
          transition: background-color 5000s ease-in-out 0s !important;
          caret-color: white !important;
        }

        input::placeholder {
          color: rgba(255,255,255,0.32);
        }

        input:focus {
          border-bottom-color: rgba(255,255,255,0.65) !important;
        }

        * {
          font-family: 'Inter', sans-serif;
        }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {/* Background waves */}
        <div className="absolute inset-0 pointer-events-none">
          <svg
            className="absolute bottom-0 w-full"
            viewBox="0 0 1440 420"
            preserveAspectRatio="xMidYMax slice"
          >
            <path
              d="M0 420 L0 280 L120 180 L240 260 L360 140 L480 220 L600 100 L720 200 L840 120 L960 210 L1080 140 L1200 230 L1320 160 L1440 240 L1440 420 Z"
              fill="rgba(15,20,80,0.7)"
            />
            <path
              d="M0 420 L0 320 L180 240 L300 300 L420 200 L540 280 L660 180 L780 260 L900 190 L1020 270 L1140 210 L1260 300 L1380 240 L1440 290 L1440 420 Z"
              fill="rgba(10,14,60,0.85)"
            />
          </svg>
        </div>

        {/* Card */}
        <div
          className="relative z-10 mx-auto"
          style={{
            width: "560px",
            maxWidth: "90%",
            padding: "32px 40px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          }}
        >
          <h2
            style={{
              textAlign: "center",
              fontSize: "24px",
              color: "white",
              fontWeight: 600,
              marginBottom: "22px",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            Create Account
          </h2>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 24px",
              }}
            >
              {/* Full Name */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Full Name</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Your name"
                    autoComplete="name"
                    {...register("name")}
                    style={inputStyle}
                  />
                </div>
                {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
              </div>

              {/* Company Name */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Company Name</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Your company"
                    autoComplete="organization"
                    {...register("companyName")}
                    style={inputStyle}
                  />
                </div>
                {errors.companyName && <p style={errorStyle}>{errors.companyName.message}</p>}
              </div>

              {/* Email — full width */}
              <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Email</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...register("email")}
                    style={inputStyle}
                  />
                </div>
                {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                    {...register("password")}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    style={eyeBtnStyle}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    style={eyeBtnStyle}
                  >
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p style={errorStyle}>{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* API Error */}
            {error && (
              <div style={{ ...errorStyle, fontSize: "12px", marginBottom: "12px", marginTop: "4px" }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <div style={{ marginTop: "20px" }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: "999px",
                  background: "white",
                  color: "#4338ca",
                  fontWeight: 600,
                  fontSize: "16px",
                  fontFamily: "Inter, sans-serif",
                  border: "none",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.7 : 1,
                  marginBottom: "14px",
                }}
              >
                {isSubmitting ? "Creating account..." : "Register"}
              </button>

              {/* Login link */}
              <div
                style={{
                  textAlign: "center",
                  fontSize: "16px",
                  color: "rgba(255,255,255,0.55)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={onRegisterSuccess}
                  style={{
                    background: "none",
                    border: "none",
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "16px",
                    textDecoration: "underline",
                    padding: 0,
                    marginLeft: "3px",
                  }}
                >
                  Login
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}