"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { updateClient } from "@/lib/services/clients";
import {
  fetchAvailableBonusBalance,
  fetchPurchasesByClientId,
  type ClientPurchaseItem,
} from "@/lib/services/transactions";
import type { Client } from "@/lib/types/client";
import styles from "./ClientDetailModal.module.css";

const MIN_NAME_LENGTH = 3;
const VIN_LENGTH = 17;
const VIN_REGEX = /^[A-Za-z0-9]{17}$/;

function formatPurchaseDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPurchaseAmount(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + " ₽";
}

interface ClientDetailModalProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onSuccess: () => void;
  onNewPurchase: (client: Client) => void;
}

export function ClientDetailModal({
  isOpen,
  client,
  onClose,
  onSuccess,
  onNewPurchase,
}: ClientDetailModalProps) {
  const [nameInput, setNameInput] = useState("");
  const [vinInput, setVinInput] = useState("");
  const [availableBonus, setAvailableBonus] = useState<number | null>(null);
  const [isLoadingBonus, setIsLoadingBonus] = useState(false);
  const [purchases, setPurchases] = useState<ClientPurchaseItem[]>([]);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveVinSuccess, setSaveVinSuccess] = useState(false);

  const totalBonus = client?.bonus_balance ?? 0;
  const availableBonusValue = availableBonus ?? 0;

  useEffect(() => {
    if (client) {
      setNameInput(client.name);
      setVinInput(client.vin ?? "");
      setError(null);
      setSaveSuccess(false);
      setSaveVinSuccess(false);
    }
  }, [client]);

  useEffect(() => {
    if (!isOpen || !client) {
      setAvailableBonus(null);
      return;
    }

    let isCancelled = false;

    const loadBonus = async () => {
      setIsLoadingBonus(true);
      try {
        const value = await fetchAvailableBonusBalance(client.id);
        if (!isCancelled) {
          setAvailableBonus(value);
        }
      } catch {
        if (!isCancelled) {
          setAvailableBonus(0);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingBonus(false);
        }
      }
    };

    void loadBonus();

    return () => {
      isCancelled = true;
    };
  }, [client, isOpen]);

  useEffect(() => {
    if (!isOpen || !client) {
      setPurchases([]);
      return;
    }

    let isCancelled = false;

    const loadPurchases = async () => {
      setIsLoadingPurchases(true);
      try {
        const list = await fetchPurchasesByClientId(client.id);
        if (!isCancelled) {
          setPurchases(list);
        }
      } catch {
        if (!isCancelled) {
          setPurchases([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPurchases(false);
        }
      }
    };

    void loadPurchases();

    return () => {
      isCancelled = true;
    };
  }, [client, isOpen]);

  const handleClose = useCallback(() => {
    setError(null);
    setSaveSuccess(false);
    setSaveVinSuccess(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, handleClose]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleSaveName = async () => {
    if (!client) return;

    const trimmed = nameInput.trim();
    setError(null);
    setSaveSuccess(false);

    if (trimmed.length === 0) {
      setError("Введите имя");
      return;
    }

    if (trimmed.length < MIN_NAME_LENGTH) {
      setError("Имя должно быть не менее 3 символов");
      return;
    }

    if (trimmed === client.name) {
      return;
    }

    setIsSaving(true);
    try {
      await updateClient(client.id, { name: trimmed });
      onSuccess();
      try {
        window.localStorage.setItem(
          "clients_last_update",
          Date.now().toString()
        );
      } catch {
        // ignore
      }
      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVin = async () => {
    if (!client) return;

    const value = vinInput.trim();
    const currentVin = client.vin ?? "";
    if (value === currentVin) return;

    if (value && !VIN_REGEX.test(value)) {
      setError(
        `VIN должен содержать ${VIN_LENGTH} символов: латинские буквы и цифры`
      );
      return;
    }

    setError(null);
    setSaveVinSuccess(false);

    setIsSaving(true);
    try {
      await updateClient(client.id, {
        vin: value ? value.toUpperCase() : null,
      });
      onSuccess();
      try {
        window.localStorage.setItem(
          "clients_last_update",
          Date.now().toString()
        );
      } catch {
        // ignore
      }
      setSaveVinSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewPurchase = () => {
    if (client) {
      onNewPurchase(client);
    }
  };

  if (!isOpen || !client) return null;

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-detail-title"
    >
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 id="client-detail-title" className={styles.title}>
            Карточка клиента
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSaving}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
        <div className={styles.section}>
          <label htmlFor="client-name" className={styles.label}>
            Имя
          </label>
          <div className={styles.nameRow}>
            <input
              id="client-name"
              type="text"
              className={styles.input}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              disabled={isSaving}
              aria-describedby="name-hint"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSaveName}
              disabled={isSaving || nameInput.trim() === client.name}
            >
              {isSaving ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
          <span id="name-hint" className={styles.hint}>
            Не менее 3 символов
          </span>
          {saveSuccess && (
            <span className={styles.success} role="status">
              Сохранено
            </span>
          )}
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Телефон</span>
          <span className={styles.readOnly}>{client.phone ?? "—"}</span>
        </div>

        <div className={styles.section}>
          <label htmlFor="client-vin" className={styles.label}>
            VIN-код
          </label>
          <div className={styles.nameRow}>
            <input
              id="client-vin"
              type="text"
              className={styles.input}
              value={vinInput}
              onChange={(e) => setVinInput(e.target.value)}
              disabled={isSaving}
              placeholder="Не указан"
              maxLength={VIN_LENGTH}
              autoComplete="off"
              aria-describedby="vin-hint"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSaveVin}
              disabled={
                isSaving ||
                vinInput.trim() === (client.vin ?? "") ||
                (vinInput.trim() !== "" &&
                  (vinInput.trim().length !== VIN_LENGTH ||
                    !VIN_REGEX.test(vinInput.trim())))
              }
            >
              {isSaving ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
          <span id="vin-hint" className={styles.hint}>
            {VIN_LENGTH} символов (латинские буквы и цифры) или пусто
          </span>
          {saveVinSuccess && (
            <span className={styles.success} role="status">
              Сохранено
            </span>
          )}
        </div>

        <div className={styles.balance}>
          <span className={styles.balanceLabel}>Всего бонусов</span>
          <span className={styles.balanceValue}>
            {totalBonus.toFixed(0)}
          </span>
        </div>
        <div className={styles.balance}>
          <span className={styles.balanceLabel}>Доступно к списанию</span>
          <span className={styles.balanceValue}>
            {isLoadingBonus ? "…" : availableBonusValue.toFixed(0)}
          </span>
        </div>

        <div className={styles.section}>
          <div className={styles.purchaseHeader}>
            <span className={styles.label}>Покупок</span>
            <span className={styles.readOnly}>{client.total_orders_count}</span>
          </div>
          {isLoadingPurchases ? (
            <span className={styles.purchaseDates}>Загрузка дат…</span>
          ) : purchases.length > 0 ? (
            <ul className={styles.purchaseDates} aria-label="Даты и суммы покупок">
              {purchases.map((p) => (
                <li key={p.id}>
                  {formatPurchaseDate(p.created_at)} — {formatPurchaseAmount(p.purchase_amount)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Отмена
          </Button>
          <Button
            type="button"
            onClick={handleNewPurchase}
            disabled={isSaving}
          >
            Новая покупка
          </Button>
        </div>
      </div>
    </div>
  );
}
