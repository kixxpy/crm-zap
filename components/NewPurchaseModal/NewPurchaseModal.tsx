"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  createPurchase,
  fetchAvailableBonusBalance,
} from "@/lib/services/transactions";
import type { Client } from "@/lib/types/client";
import styles from "./NewPurchaseModal.module.css";

const MAX_BONUS_PERCENT = 0.2;
const BONUS_EARN_RATE = 0.03;

type BonusMode = "earn_only" | "spend_only";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

interface NewPurchaseModalProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewPurchaseModal({
  isOpen,
  client,
  onClose,
  onSuccess,
}: NewPurchaseModalProps) {
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [bonusToDeduct, setBonusToDeduct] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bonusMode, setBonusMode] = useState<BonusMode>("earn_only");

  const [availableBonus, setAvailableBonus] = useState<number | null>(null);
  const [isLoadingBonus, setIsLoadingBonus] = useState(false);

  const totalBonus = client?.bonus_balance ?? 0;
  const availableBonusValue = availableBonus ?? 0;
  const purchaseNum = parseFloat(purchaseAmount) || 0;
  const bonusNum = parseFloat(bonusToDeduct) || 0;

  const maxBonusDeduction = useMemo(() => {
    const byPercent = roundMoney(purchaseNum * MAX_BONUS_PERCENT);
    return Math.min(availableBonusValue, byPercent, purchaseNum);
  }, [purchaseNum, availableBonusValue]);

  const effectiveDeduction = useMemo(() => {
    if (bonusMode === "earn_only") return 0;
    return Math.min(bonusNum, maxBonusDeduction, purchaseNum);
  }, [bonusMode, bonusNum, maxBonusDeduction, purchaseNum]);

  const toPay = useMemo(() => {
    return roundMoney(Math.max(0, purchaseNum - effectiveDeduction));
  }, [purchaseNum, effectiveDeduction]);

  const bonusEarned = useMemo(() => {
    if (bonusMode === "spend_only") return 0;
    return roundMoney(toPay * BONUS_EARN_RATE);
  }, [bonusMode, toPay]);

  const resetForm = useCallback(() => {
    setPurchaseAmount("");
    setBonusToDeduct("");
    setError(null);
    setBonusMode("earn_only");
    setAvailableBonus(null);
    setIsLoadingBonus(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (purchaseNum <= 0) {
      setError("Сумма покупки должна быть больше нуля");
      return;
    }

    if (bonusMode === "spend_only" && (bonusToDeduct.trim() === "" || bonusNum <= 0)) {
      setError("Укажите, сколько бонусов нужно списать");
      return;
    }

    if (effectiveDeduction < 0) {
      setError("Сумма списания бонусов не может быть отрицательной");
      return;
    }

    if (effectiveDeduction > availableBonusValue) {
      setError("Недостаточно бонусов для списания");
      return;
    }

    if (!client) return;

    setIsSubmitting(true);

    try {
      await createPurchase({
        client_id: client.id,
        purchase_amount: purchaseNum,
        bonus_used: effectiveDeduction,
        accrue_bonus: bonusMode === "earn_only",
      });
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
      setError(err instanceof Error ? err.message : "Ошибка при сохранении");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !client) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-purchase-title"
    >
      <div className={styles.dialog}>
        <h2 id="new-purchase-title" className={styles.title}>
          Новая покупка — {client.name}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.balance}>
            <span className={styles.balanceLabel}>Всего бонусов:</span>
            <span className={styles.balanceValue}>
              {totalBonus.toFixed(0)}
            </span>
          </div>
          <div className={styles.balance}>
            <span className={styles.balanceLabel}>Доступно к списанию:</span>
            <span className={styles.balanceValue}>
              {isLoadingBonus ? "…" : availableBonusValue.toFixed(0)}
            </span>
          </div>

          <div className={styles.field}>
            <label htmlFor="purchase-amount">Сумма покупки</label>
            <input
              id="purchase-amount"
              type="number"
              min="0"
              step="0.01"
              className={styles.input}
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.bonusMode}>
            <span className={styles.bonusModeLabel}>Режим бонусов</span>
            <div className={styles.bonusModeOptions}>
              <label className={styles.bonusModeOption}>
                <input
                  type="radio"
                  name="bonus-mode"
                  value="earn_only"
                  checked={bonusMode === "earn_only"}
                  onChange={() => setBonusMode("earn_only")}
                  disabled={isSubmitting}
                />
                <span>Накопить бонусы</span>
              </label>
              <label className={styles.bonusModeOption}>
                <input
                  type="radio"
                  name="bonus-mode"
                  value="spend_only"
                  checked={bonusMode === "spend_only"}
                  onChange={() => setBonusMode("spend_only")}
                  disabled={isSubmitting}
                />
                <span>Списать бонусы</span>
              </label>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="bonus-deduct">Сколько списать бонусов</label>
            <input
              id="bonus-deduct"
              type="number"
              min="0"
              step="1"
              max={maxBonusDeduction}
              className={styles.input}
              value={bonusToDeduct}
              onChange={(e) => setBonusToDeduct(e.target.value)}
              placeholder="0"
              disabled={isSubmitting || bonusMode === "earn_only"}
              required={bonusMode === "spend_only"}
            />
            {purchaseNum > 0 && (
              <span className={styles.hint}>
                Максимум: {maxBonusDeduction.toFixed(0)} (20% от суммы)
              </span>
            )}
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>К оплате</span>
              <span className={styles.summaryValue}>{toPay.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Начислится бонусов</span>
              <span className={styles.summaryValue}>
                {bonusMode === "spend_only"
                  ? "0 (при списании не начисляются)"
                  : `${bonusEarned.toFixed(0)} (3%)`}
              </span>
            </div>
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
              {isSubmitting ? "Сохранение…" : "Оформить покупку"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
