"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getAdminStats,
  getAdminUsers,
  getAdminModules,
  updateUserModules,
  toggleUserActive,
  deleteUser,
  createUserProfile,
  getSupportTickets,
  updateTicketStatus,
} from "@/lib/api";
import type { AdminUser, AdminStats, UserModule, SupportTicket } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

function AdminContent() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [modules, setModules] = useState<UserModule[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "requests" | "tickets">("users");

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Module editor modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editModules, setEditModules] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [s, u, m, t] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminModules(),
        getSupportTickets(),
      ]);
      setStats(s);
      setUsers(u);
      setModules(m);
      setTickets(t);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateUser = async () => {
    if (!newEmail.trim() || !newName.trim() || !newPassword) return;
    setCreating(true);
    setError(null);

    try {
      // Create Supabase auth account using admin invite
      const { data, error: authError } = await supabase.auth.admin.createUser({
        email: newEmail.trim(),
        password: newPassword,
        email_confirm: true,
        user_metadata: { display_name: newName.trim() },
      });

      if (authError) {
        // Fallback: try signUp (for non-admin Supabase keys)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: newEmail.trim(),
          password: newPassword,
          options: {
            data: { display_name: newName.trim() },
          },
        });

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Failed to create user");

        await createUserProfile({
          auth_id: signUpData.user.id,
          email: newEmail.trim(),
          display_name: newName.trim(),
        });
      } else {
        if (!data.user) throw new Error("Failed to create user");
        await createUserProfile({
          auth_id: data.user.id,
          email: newEmail.trim(),
          display_name: newName.trim(),
        });
      }

      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setShowCreate(false);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      await toggleUserActive(user.id, !user.is_active);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`Удалить пользователя ${user.display_name}?`)) return;
    try {
      await deleteUser(user.id);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const openModuleEditor = (user: AdminUser) => {
    setEditingUser(user);
    setEditModules([...user.modules]);
  };

  const toggleModule = (moduleId: string) => {
    setEditModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((m) => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const saveModules = async () => {
    if (!editingUser) return;
    try {
      await updateUserModules(editingUser.id, editModules);
      setEditingUser(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update modules");
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await updateTicketStatus(ticketId, status);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-screen">
          <span className="spinner" />
          <span>Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header__inner">
          <div className="header__logo">
            <Link href="/" className="back-btn">
              ← Назад
            </Link>
            <div className="header__logo-icon" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
              ⚙️
            </div>
            <div>
              <div className="header__title">Админ-панель</div>
              <div className="header__subtitle">Управление платформой</div>
            </div>
          </div>
          <button
            className="btn btn--primary"
            onClick={() => setShowCreate(true)}
            id="create-user-btn"
          >
            + Пользователь
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="toast toast--error" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="debt-summary" style={{ marginBottom: "var(--space-2xl)" }}>
          <div className="debt-card">
            <div className="debt-card__label">Пользователи</div>
            <div className="debt-card__value" style={{ color: "var(--accent)" }}>
              {stats.total_users}
            </div>
          </div>
          <div className="debt-card">
            <div className="debt-card__label">Активные</div>
            <div className="debt-card__value" style={{ color: "var(--success)" }}>
              {stats.active_users}
            </div>
          </div>
          <div className="debt-card">
            <div className="debt-card__label">Модули</div>
            <div className="debt-card__value" style={{ color: "var(--info)" }}>
              {stats.total_modules}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ display: "flex", gap: "var(--space-md)", marginBottom: "var(--space-xl)", borderBottom: "1px solid var(--border-color)" }}>
        <button 
          className={`btn ${activeTab === "users" ? "btn--primary" : "btn--ghost"}`}
          onClick={() => setActiveTab("users")}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          👥 Пользователи
        </button>
        <button 
          className={`btn ${activeTab === "requests" ? "btn--primary" : "btn--ghost"}`}
          onClick={() => setActiveTab("requests")}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          📝 Заявки {users.filter(u => !u.is_active).length > 0 && <span className="admin-badge" style={{ backgroundColor: "var(--accent)", marginLeft: 8 }}>{users.filter(u => !u.is_active).length}</span>}
        </button>
        <button 
          className={`btn ${activeTab === "tickets" ? "btn--primary" : "btn--ghost"}`}
          onClick={() => setActiveTab("tickets")}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          🆘 Обращения {tickets.filter(t => t.status === "open").length > 0 && <span className="admin-badge" style={{ backgroundColor: "var(--accent)", marginLeft: 8 }}>{tickets.filter(t => t.status === "open").length}</span>}
        </button>
      </div>

      {activeTab === "users" || activeTab === "requests" ? (
        <>
          {/* Users List */}
          <h2 style={{ marginBottom: "var(--space-md)" }}>
            {activeTab === "users" ? "Все пользователи" : "Новые заявки"}
          </h2>
          <div className="admin-user-list">
            {users
              .filter(u => activeTab === "users" ? true : !u.is_active)
              .map((user) => (
              <div key={user.id} className="admin-user-card" id={`admin-user-${user.id}`} style={!user.is_active ? { borderLeft: "3px solid var(--accent)" } : {}}>
                <div className="admin-user-card__info">
                  <div className="admin-user-card__avatar">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="admin-user-card__name">
                      {user.display_name}
                      {user.role === "admin" && (
                        <span className="admin-badge">Админ</span>
                      )}
                      {!user.is_active && (
                        <span className="inactive-badge" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", color: "var(--accent)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>Новая заявка</span>
                      )}
                    </div>
                    <div className="admin-user-card__email">{user.email}</div>
                    <div className="admin-user-card__modules">
                      {user.modules.length > 0
                        ? user.modules
                            .map((mid) => {
                              const mod = modules.find((m) => m.id === mid);
                              return mod ? `${mod.icon || "📦"} ${mod.name}` : mid;
                            })
                            .join(" • ")
                        : "Нет доступных модулей"}
                    </div>
                  </div>
                </div>
                <div className="admin-user-card__actions">
                  {!user.is_active && (
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={async () => {
                        await handleToggleActive(user);
                        openModuleEditor(user); // Prompt to assign modules after activation
                      }}
                    >
                      ✅ Одобрить
                    </button>
                  )}
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => openModuleEditor(user)}
                    title="Настроить модули"
                  >
                    🔧 Модули
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => handleToggleActive(user)}
                    title={user.is_active ? "Деактивировать" : "Активировать"}
                  >
                    {user.is_active ? "🔒" : "🔓"}
                  </button>
                  {user.role !== "admin" && (
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={() => handleDeleteUser(user)}
                      title="Удалить"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
            {activeTab === "requests" && users.filter(u => !u.is_active).length === 0 && (
              <div className="empty-state">Нет новых заявок на регистрацию</div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Support Tickets List */}
          <h2 style={{ marginBottom: "var(--space-md)" }}>Обращения пользователей</h2>
          <div className="admin-user-list">
            {tickets.length === 0 ? (
              <div className="empty-state">Нет обращений</div>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="admin-user-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "var(--space-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                      <div className="admin-user-card__avatar" style={{ width: 32, height: 32, fontSize: "0.9rem" }}>
                        {ticket.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: "bold" }}>{ticket.user_name}</div>
                        <div className="admin-user-card__email" style={{ fontSize: "0.8rem" }}>{ticket.user_email}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                      <span className="admin-badge" style={{ 
                        backgroundColor: ticket.status === "open" ? "var(--accent)" : ticket.status === "resolved" ? "var(--success)" : "var(--text-muted)",
                        color: "white"
                      }}>
                        {ticket.status === "open" ? "Новый" : ticket.status === "resolved" ? "Решен" : "Закрыт"}
                      </span>
                      <span className="admin-user-card__email" style={{ fontSize: "0.8rem" }}>
                        {new Date(ticket.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ width: "100%", padding: "var(--space-md)", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--accent)" }}>
                    <div style={{ fontWeight: "600", marginBottom: "var(--space-xs)" }}>{ticket.subject}</div>
                    <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>{ticket.message}</div>
                  </div>

                  <div className="admin-user-card__actions" style={{ marginLeft: 0 }}>
                    <button 
                      className={`btn btn--sm ${ticket.status === "resolved" ? "btn--primary" : "btn--outline"}`}
                      onClick={() => handleUpdateTicketStatus(ticket.id, "resolved")}
                    >
                      ✅ Решен
                    </button>
                    <button 
                      className={`btn btn--sm ${ticket.status === "closed" ? "btn--ghost" : "btn--outline"}`}
                      onClick={() => handleUpdateTicketStatus(ticket.id, "closed")}
                    >
                      🔒 Закрыть
                    </button>
                    {ticket.status !== "open" && (
                      <button 
                        className="btn btn--sm btn--outline"
                        onClick={() => handleUpdateTicketStatus(ticket.id, "open")}
                      >
                        🔄 Переоткрыть
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Новый пользователь</h2>
              <button className="modal__close" onClick={() => setShowCreate(false)}>
                ×
              </button>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-user-name">Имя</label>
              <input
                id="new-user-name"
                className="form-input"
                type="text"
                placeholder="Имя Фамилия"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-user-email">Email</label>
              <input
                id="new-user-email"
                className="form-input"
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-user-password">Пароль</label>
              <input
                id="new-user-password"
                className="form-input"
                type="password"
                placeholder="Минимум 6 символов"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setShowCreate(false)}>
                Отмена
              </button>
              <button
                className="btn btn--primary"
                onClick={handleCreateUser}
                disabled={creating || !newEmail.trim() || !newName.trim() || !newPassword}
                id="confirm-create-user-btn"
              >
                {creating ? <span className="spinner" /> : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Module Editor Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                Модули: {editingUser.display_name}
              </h2>
              <button className="modal__close" onClick={() => setEditingUser(null)}>
                ×
              </button>
            </div>

            <div className="module-toggle-list">
              {modules.map((mod) => (
                <div key={mod.id} className="module-toggle-item">
                  <div className="module-toggle-item__info">
                    <span className="module-toggle-item__icon">{mod.icon || "📦"}</span>
                    <span className="module-toggle-item__name">{mod.name}</span>
                  </div>
                  <button
                    className={`toggle-switch ${
                      editModules.includes(mod.id) ? "toggle-switch--active" : ""
                    }`}
                    onClick={() => toggleModule(mod.id)}
                    id={`toggle-module-${mod.id}`}
                  >
                    <div className="toggle-switch__thumb" />
                  </button>
                </div>
              ))}
            </div>

            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setEditingUser(null)}>
                Отмена
              </button>
              <button
                className="btn btn--primary"
                onClick={saveModules}
                id="save-modules-btn"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}
