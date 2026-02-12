"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/services/clients";
import type { CreateClientInput } from "@/lib/types/client";
import styles from "./AddClientModal.module.css";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddClientModal({
  isOpen,
  onClose,
  onSuccess,
}: AddClientModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vin, setVin] = useState("");
  const [role, setRole] = useState<"client" | "master">("client");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setPhone("");
    setVin("");
    setRole("client");
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedVin = vin.trim();

    if (role !== "client" && role !== "master") {
      setError("Неверная роль клиента");
      return;
    }

    if (!trimmedName) {
      setError("Имя обязательно");
      return;
    }

    if (!trimmedPhone) {
      setError("Телефон обязателен");
      return;
    }

    if (!/^8\d{10}$/.test(trimmedPhone)) {
      setError("Телефон должен быть в формате 89168184416");
      return;
    }

    if (trimmedVin && !/^[A-Za-z0-9]{17}$/.test(trimmedVin)) {
      setError("VIN должен содержать 17 символов: латинские буквы и цифры");
      return;
    }

    setIsSubmitting(true);

    try {
      const input: CreateClientInput = {
        name: trimmedName,
        phone: trimmedPhone,
        vin: trimmedVin ? trimmedVin.toUpperCase() : undefined,
        role,
      };
      await createClient(input);
      resetForm();
      onSuccess();
      try {
        window.localStorage.setItem(
          "clients_last_update",
          Date.now().toString()
        );
      } catch {
        // ignore cross-tab sync errors
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при добавлении");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-client-title"
    >
      <div className={styles.dialog}>
        <h2 id="add-client-title" className={styles.title}>
          Добавить клиента
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.roleLabel}>Роль *</label>
            <div className={styles.roleGroup} role="radiogroup" aria-label="Роль клиента">
              <label
                className={`${styles.roleOption} ${
                  role === "client" ? styles.roleOptionActive : ""
                }`}
              >
                <input
                  type="radio"
                  name="client-role"
                  value="client"
                  checked={role === "client"}
                  onChange={() => setRole("client")}
                  disabled={isSubmitting}
                />
                <span>Клиент</span>
              </label>
              <label
                className={`${styles.roleOption} ${
                  role === "master" ? styles.roleOptionActive : ""
                }`}
              >
                <input
                  type="radio"
                  name="client-role"
                  value="master"
                  checked={role === "master"}
                  onChange={() => setRole("master")}
                  disabled={isSubmitting}
                />
                <span>Мастер</span>
              </label>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="client-name">Имя *</label>
            <input
              id="client-name"
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              autoFocus
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="client-phone">Телефон *</label>
            <input
              id="client-phone"
              type="tel"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="8(916)000-00-00"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="client-vin">VIN (необязательно)</label>
            <input
              id="client-vin"
              type="text"
              className={styles.input}
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="WVWZZZ3CZWE123456"
              disabled={isSubmitting}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Сохранение…" : "Добавить"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
