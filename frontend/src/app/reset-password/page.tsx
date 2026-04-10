"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("Заполните все поля");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }

    try {
      setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      // Wait a bit and redirect to login
      setTimeout(() => {
        router.replace("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Ошибка при смене пароля");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div className="login-logo">
            <span style={{ fontSize: "3rem", marginBottom: "20px", display: "block" }}>✅</span>
            <h1 className="login-logo__title">Пароль изменен!</h1>
          </div>
          <p style={{ margin: "var(--space-lg) 0", lineHeight: "1.6", color: "var(--text-muted)" }}>
            Ваш пароль был успешно обновлен. Сейчас вы будете перенаправлены на страницу входа.
          </p>
          <div className="spinner" style={{ margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <h1 className="login-logo__title">Новый пароль</h1>
          <p className="login-logo__subtitle">Установите надежный пароль для вашего аккаунта</p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="reset-password">
              Новый пароль
            </label>
            <input
              id="reset-password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-reset-password">
              Подтвердите пароль
            </label>
            <input
              id="confirm-reset-password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--lg btn--block"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : "Обновить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
