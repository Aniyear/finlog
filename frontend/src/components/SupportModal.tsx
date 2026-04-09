"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !message) {
      setError("Пожалуйста, заполните все поля");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await import("@/lib/supabaseClient").then(m => m.supabase.auth.getSession());
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/support/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ subject, message })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || " Ошибка при отправке сообщения");
      }

      setSuccess(true);
      setSubject("");
      setMessage("");
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Не удалось отправить сообщение");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: "500px", padding: 0, overflow: "hidden" }}>
        {/* Header with Gradient Background */}
        <div style={{ 
          background: "linear-gradient(135deg, var(--bg-card), var(--bg-glass-hover))", 
          padding: "var(--space-xl)",
          borderBottom: "1px solid var(--border-color)",
          position: "relative"
        }}>
          <button 
            className="modal-close" 
            onClick={onClose}
            style={{ position: "absolute", top: "var(--space-md)", right: "var(--space-md)" }}
          >
            &times;
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            <div style={{ 
              width: "48px", 
              height: "48px", 
              borderRadius: "var(--radius-md)", 
              background: "var(--accent-gradient)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              fontSize: "1.5rem",
              boxShadow: "var(--shadow-glow)"
            }}>
              💬
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text-primary)" }}>Служба поддержки</h2>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Мы ответим вам в ближайшее время</p>
            </div>
          </div>
        </div>

        <div style={{ padding: "var(--space-xl)" }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "var(--space-xl) 0" }}>
              <div style={{ 
                width: "80px", 
                height: "80px", 
                borderRadius: "50%", 
                background: "var(--success-bg)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                fontSize: "2.5rem",
                margin: "0 auto var(--space-lg)"
              }}>
                ✅
              </div>
              <h3 style={{ marginBottom: "var(--space-sm)", fontSize: "1.5rem" }}>Готово!</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
                Ваше сообщение отправлено. Администратор уже получил уведомление в Telegram.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ 
                  padding: "var(--space-sm) var(--space-md)", 
                  background: "var(--danger-bg)", 
                  border: "1px solid var(--danger)", 
                  borderRadius: "var(--radius-sm)",
                  color: "var(--danger)",
                  fontSize: "0.85rem",
                  marginBottom: "var(--space-lg)"
                }}>
                  {error}
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: "var(--space-xs)" }}>Тема обращения</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="В чем заключается ваша проблема?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                  style={{ background: "rgba(0,0,0,0.2)" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: "var(--space-xs)" }}>Сообщение</label>
                <textarea 
                  className="form-input" 
                  rows={4} 
                  placeholder="Опишите ситуацию подробнее..."
                  style={{ resize: "none", background: "rgba(0,0,0,0.2)" }}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div style={{ display: "flex", gap: "var(--space-md)", marginTop: "var(--space-xl)" }}>
                <button 
                  type="button" 
                  className="btn btn--ghost" 
                  style={{ flex: 1, height: "45px" }} 
                  onClick={onClose}
                  disabled={loading}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="btn btn--primary" 
                  style={{ flex: 2, height: "45px" }}
                  disabled={loading}
                >
                  {loading ? <span className="spinner" /> : "Отправить запрос"}
                </button>
              </div>
              
              <p style={{ 
                marginTop: "var(--space-lg)", 
                fontSize: "0.75rem", 
                color: "var(--text-muted)", 
                textAlign: "center" 
              }}>
                Используя поддержку, вы соглашаетесь с обработкой персональных данных
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );

}
