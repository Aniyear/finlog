"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { AdminUser, AdminStats, UserModule } from "@/types";
import {
  getAdminStats,
  getAdminUsers,
  getAdminModules,
  updateUserModules,
  toggleUserActive,
  deleteUser,
  createUserProfile,
} from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

function AdminContent() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [modules, setModules] = useState<UserModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const [s, u, m] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminModules(),
      ]);
      setStats(s);
      setUsers(u);
      setModules(m);
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
            <Link href="/" className="back-link" style={{ marginRight: "var(--space-sm)" }}>
              ←
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

      {/* Users List */}
      <h2 style={{ marginBottom: "var(--space-md)" }}>Пользователи</h2>
      <div className="admin-user-list">
        {users.map((user) => (
          <div key={user.id} className="admin-user-card" id={`admin-user-${user.id}`}>
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
                    <span className="inactive-badge">Неактивен</span>
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
                    : "Нет модулей"}
                </div>
              </div>
            </div>
            <div className="admin-user-card__actions">
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
      </div>

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
