"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  fetchDailySalesSummaries,
  fetchTransactionsForDate,
  refundTransaction,
  type SalesTransactionWithRefundFlag,
} from "@/lib/services/transactions";
import type { DailySalesSummary } from "@/lib/types/transaction";
import styles from "./page.module.css";

function formatCurrency(value: number): string {
  return value.toFixed(2);
}

function formatInteger(value: number): string {
  return value.toFixed(0);
}

function formatDateLabel(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return date;
  }
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function SalesPage() {
  const [summaries, setSummaries] = useState<DailySalesSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState<boolean>(true);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] =
    useState<boolean>(false);
  const [transactions, setTransactions] = useState<
    SalesTransactionWithRefundFlag[]
  >([]);
  const [isLoadingTransactions, setIsLoadingTransactions] =
    useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRefundingId, setIsRefundingId] = useState<string | null>(null);

  const totals = useMemo(
    () =>
      summaries.reduce(
        (acc, day) => ({
          orders_count: acc.orders_count + day.orders_count,
          total_purchase_amount:
            acc.total_purchase_amount + day.total_purchase_amount,
          total_final_paid: acc.total_final_paid + day.total_final_paid,
          total_bonus_earned:
            acc.total_bonus_earned + day.total_bonus_earned,
          total_bonus_used: acc.total_bonus_used + day.total_bonus_used,
        }),
        {
          orders_count: 0,
          total_purchase_amount: 0,
          total_final_paid: 0,
          total_bonus_earned: 0,
          total_bonus_used: 0,
        }
      ),
    [summaries]
  );

  const loadSummaries = useCallback(async () => {
    setIsLoadingSummaries(true);
    setError(null);
    try {
      const data = await fetchDailySalesSummaries();
      setSummaries(data);
      if (data.length > 0 && !selectedDate) {
        setSelectedDate(data[0].date);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить продажи"
      );
    } finally {
      setIsLoadingSummaries(false);
    }
  }, [selectedDate]);

  const loadTransactions = useCallback(async () => {
    if (!selectedDate) {
      setTransactions([]);
      return;
    }

    setIsLoadingTransactions(true);
    setActionError(null);

    try {
      const data = await fetchTransactionsForDate(selectedDate);
      setTransactions(data);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить транзакции за день"
      );
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setIsTransactionsModalOpen(true);
  };

  const handleRefund = async (tx: SalesTransactionWithRefundFlag) => {
    if (tx.is_refunded) {
      return;
    }

    const confirmed = window.confirm(
      "Отменить начисленные бонусы и оформить возврат по этой покупке?"
    );
    if (!confirmed) return;

    setIsRefundingId(tx.id);
    setActionError(null);

    try {
      await refundTransaction({ transaction_id: tx.id });

      try {
        window.localStorage.setItem(
          "clients_last_update",
          Date.now().toString()
        );
      } catch {
        // ignore cross-tab sync errors
      }

      setTransactions((prev) =>
        prev.map((item) =>
          item.id === tx.id ? { ...item, is_refunded: true } : item
        )
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Не удалось оформить возврат по покупке"
      );
    } finally {
      setIsRefundingId(null);
    }
  };

  useEffect(() => {
    if (!isTransactionsModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isTransactionsModalOpen]);

  return (
    <main className={styles.container}>
      {error && <div className={styles.error}>{error}</div>}

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Продажи по дням</h1>
          <p className={styles.subtitle}>
            Выберите день, чтобы увидеть чеки и при необходимости отменить
            начисленные бонусы.
          </p>
        </div>
        <div className={styles.toolbar}>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void loadSummaries();
              void loadTransactions();
            }}
            disabled={isLoadingSummaries || isLoadingTransactions}
          >
            {isLoadingSummaries || isLoadingTransactions
              ? "Обновляем…"
              : "Обновить данные"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Назад к клиентам</Link>
          </Button>
        </div>
      </header>

      {summaries.length > 0 && (
        <section className={styles.stats} aria-label="Сводка по всем дням">
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Всего дней</span>
            <span className={styles.statValue}>
              {formatInteger(summaries.length)}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Всего чеков</span>
            <span className={styles.statValue}>
              {formatInteger(totals.orders_count)}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Оборот</span>
            <span className={styles.statValue}>
              {formatCurrency(totals.total_purchase_amount)}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>К оплате</span>
            <span className={styles.statValue}>
              {formatCurrency(totals.total_final_paid)}
            </span>
          </div>
        </section>
      )}

      <section className={styles.content}>
        <section className={styles.card} aria-label="Список дней с продажами">
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Дни с продажами</h2>
            <span className={styles.cardHint}>
              Всего дней: {summaries.length}
            </span>
          </div>

          {isLoadingSummaries ? (
            <div className={styles.loading}>Загрузка продаж…</div>
          ) : summaries.length === 0 ? (
            <div className={styles.empty}>Пока нет данных о продажах</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th className={styles.numberCell}>Чеков</th>
                    <th className={styles.numberCell}>Оборот</th>
                    <th className={styles.numberCell}>К оплате</th>
                    <th className={styles.numberCell}>Начислено бонусов</th>
                    <th className={styles.numberCell}>Списано бонусов</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((day) => {
                    const isSelected = day.date === selectedDate;
                    return (
                      <tr
                        key={day.date}
                        className={`${styles.rowClickable} ${
                          isSelected ? styles.rowSelected : ""
                        }`}
                        onClick={() => handleSelectDate(day.date)}
                      >
                        <td className={styles.dateCell}>
                          {formatDateLabel(day.date)}
                        </td>
                        <td className={styles.numberCell}>
                          {formatInteger(day.orders_count)}
                        </td>
                        <td className={styles.numberCell}>
                          {formatCurrency(day.total_purchase_amount)}
                        </td>
                        <td className={styles.numberCell}>
                          {formatCurrency(day.total_final_paid)}
                        </td>
                        <td className={styles.numberCell}>
                          {formatCurrency(day.total_bonus_earned)}
                        </td>
                        <td className={styles.numberCell}>
                          {formatCurrency(day.total_bonus_used)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      {isTransactionsModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Чеки за выбранный день"
          onClick={() => setIsTransactionsModalOpen(false)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Чеки за день</h2>
                {selectedDate && (
                  <p className={styles.modalDate}>
                    {formatDateLabel(selectedDate)}
                  </p>
                )}
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setIsTransactionsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className={styles.error}>{actionError}</div>
            )}

            {isLoadingTransactions ? (
              <div className={styles.loading}>Загрузка чеков…</div>
            ) : !selectedDate ? (
              <div className={styles.empty}>
                Выберите день в списке, чтобы увидеть чеки.
              </div>
            ) : transactions.length === 0 ? (
              <div className={styles.empty}>
                За выбранный день чеков не найдено.
              </div>
            ) : (
              <>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Время</th>
                        <th className={styles.numberCell}>Сумма</th>
                        <th className={styles.numberCell}>К оплате</th>
                        <th className={styles.numberCell}>Начислено</th>
                        <th className={styles.numberCell}>Списано</th>
                        <th className={styles.actionsCell}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => {
                        const timeLabel = new Date(
                          tx.created_at
                        ).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <tr key={tx.id}>
                            <td>{timeLabel}</td>
                            <td className={styles.numberCell}>
                              {formatCurrency(tx.purchase_amount)}
                            </td>
                            <td className={styles.numberCell}>
                              {formatCurrency(tx.final_paid)}
                            </td>
                            <td className={styles.numberCell}>
                              {formatCurrency(tx.bonus_earned)}
                            </td>
                            <td className={styles.numberCell}>
                              {formatCurrency(tx.bonus_used)}
                            </td>
                            <td className={styles.actionsCell}>
                              {tx.is_refunded ? (
                                <span
                                  className={`${styles.badge} ${styles.badgeRefunded}`}
                                >
                                  Бонусы отменены
                                </span>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRefund(tx)}
                                  disabled={isRefundingId === tx.id}
                                >
                                  {isRefundingId === tx.id
                                    ? "Отмена…"
                                    : "Отменить бонусы"}
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className={styles.transactionsTableNote}>
                  Отмена бонусов создаёт возвратную операцию и корректирует
                  баланс и статистику клиента.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

