"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Введите ваш email");
      return;
    }

    try {
      setLoading(true);
      // Construct the redirect URL (where to go after clicking the email link)
      const siteUrl = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${siteUrl}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Ошибка при отправке письма");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div className="login-logo">
            <span style={{ fontSize: "3rem", marginBottom: "20px", display: "block" }}>📩</span>
            <h1 className="login-logo__title">Проверьте почту</h1>
          </div>
          <p style={{ margin: "var(--space-lg) 0", lineHeight: "1.6", color: "var(--text-muted)" }}>
            Мы отправили ссылку для сброса пароля на адрес **{email}**. 
            Пожалуйста, перейдите по ней, чтобы установить новый пароль.
          </p>
          <Link href="/login" className="btn btn--ghost btn--block">
            Вернуться ко входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <Link href="/login" style={{ textDecoration: "none", color: "var(--text-muted)", fontSize: "0.9rem", alignSelf: "flex-start", marginBottom: "var(--space-md)" }}>
            ← Назад
          </Link>
          <h1 className="login-logo__title">Забыли пароль?</h1>
          <p className="login-logo__subtitle">Укажите email, и мы пришлем ссылку для сброса</p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">
              Email адрес
            </label>
            <input
              id="forgot-email"
              className="form-input"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--lg btn--block"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : "Отправить ссылку"}
          </button>
        </form>
      </div>
    </div>
  );
}
