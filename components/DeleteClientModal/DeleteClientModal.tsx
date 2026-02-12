"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { deleteClient } from "@/lib/services/clients";
import type { Client } from "@/lib/types/client";
import styles from "./DeleteClientModal.module.css";

interface DeleteClientModalProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteClientModal({
  isOpen,
  client,
  onClose,
  onSuccess,
}: DeleteClientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const handleConfirm = async () => {
    if (!client) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await deleteClient(client.id);
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
      setError(err instanceof Error ? err.message : "Ошибка при удалении");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      handleClose();
    }
  };

  if (!isOpen || !client) return null;

  const clientDescriptionParts: string[] = [client.name];
  if (client.phone) {
    clientDescriptionParts.push(client.phone);
  }
  if (client.vin) {
    clientDescriptionParts.push(client.vin);
  }
  const clientDescription = clientDescriptionParts.join(" · ");

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-client-title"
    >
      <div className={styles.dialog}>
        <h2 id="delete-client-title" className={styles.title}>
          Удалить клиента?
        </h2>

        <p className={styles.text}>
          Вы уверены, что хотите удалить этого клиента?
        </p>

        <p className={styles.clientSummary}>{clientDescription}</p>

        <p className={styles.warning}>
          Все связанные покупки будут удалены без возможности восстановления.
        </p>

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
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Удаление…" : "Удалить"}
          </Button>
        </div>
      </div>
    </div>
  );
}

