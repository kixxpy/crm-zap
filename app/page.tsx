"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { AddClientModal } from "@/components/AddClientModal/AddClientModal";
import { NewPurchaseModal } from "@/components/NewPurchaseModal/NewPurchaseModal";
import { DeleteClientModal } from "@/components/DeleteClientModal/DeleteClientModal";
import { fetchClients } from "@/lib/services/clients";
import { fetchAvailableBonusBalancesForClients } from "@/lib/services/transactions";
import type { Client } from "@/lib/types/client";
import styles from "./page.module.css";

const CLIENTS_PER_PAGE = 50;

function filterClients(clients: Client[], query: string): Client[] {
  const q = query.trim().toLowerCase();
  if (!q) return clients;

  return clients.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.phone?.toLowerCase().includes(q) ?? false)
  );
}

function formatBonus(value: number): string {
  return value.toFixed(0);
}

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [purchaseClient, setPurchaseClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [availableBonuses, setAvailableBonuses] = useState<
    Record<string, number>
  >({});
  const [isLoadingBonuses, setIsLoadingBonuses] = useState(false);

  const loadClients = useCallback(async (withSpinner: boolean = false) => {
    if (withSpinner) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await fetchClients();
      setClients(data);
      const ids = data.map((c) => c.id);
      setIsLoadingBonuses(true);
      try {
        const bonuses = await fetchAvailableBonusBalancesForClients(ids);
        setAvailableBonuses(bonuses);
      } catch {
        setAvailableBonuses({});
      } finally {
        setIsLoadingBonuses(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients(true);
  }, [loadClients]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "clients_last_update") {
        void loadClients(false);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadClients]);

  const filteredClients = filterClients(clients, searchQuery);

  const { paginatedClients, totalPages, currentPageSafe } = useMemo(() => {
    const total = filteredClients.length;
    const pages = Math.max(1, Math.ceil(total / CLIENTS_PER_PAGE));
    const safePage = Math.min(currentPage, pages);
    const startIndex = (safePage - 1) * CLIENTS_PER_PAGE;
    const endIndex = startIndex + CLIENTS_PER_PAGE;

    return {
      paginatedClients: filteredClients.slice(startIndex, endIndex),
      totalPages: pages,
      currentPageSafe: safePage,
    };
  }, [currentPage, filteredClients]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Клиенты</h1>
        </div>
        <div className={styles.toolbar}>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void loadClients(true);
            }}
            disabled={isLoading}
          >
            {isLoading ? "Обновляем…" : "Обновить данные"}
          </Button>
          <input
            type="search"
            className={styles.search}
            placeholder="Поиск"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Поиск клиентов"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.location.href = "/sales";
            }}
          >
            Продажи по дням
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>Добавить клиента</Button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {isLoading ? (
        <div className={styles.loading}>Загрузка…</div>
      ) : filteredClients.length === 0 ? (
        <div className={styles.empty}>
          {searchQuery
            ? "Клиенты не найдены"
            : "Пока нет клиентов. Нажмите «Добавить клиента»"}
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Телефон</th>
                  <th className={styles.colVin}>VIN</th>
                  <th>Бонусы</th>
                  <th>Покупок</th>
                  <th className={styles.colActions}></th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <span
                          className={
                            client.role === "master"
                              ? styles.roleIconMaster
                              : styles.roleIconClient
                          }
                          aria-hidden="true"
                        >
                          {client.role === "master" ? "⚙️" : "👤"}
                        </span>
                        <span>{client.name}</span>
                      </div>
                    </td>
                    <td>{client.phone ?? "—"}</td>
                    <td className={styles.colVin}>{client.vin ?? "—"}</td>
                    <td>
                      {isLoadingBonuses
                        ? "…"
                        : `${formatBonus(client.bonus_balance)} / ${formatBonus(
                            availableBonuses[client.id] ?? 0
                          )}`}
                    </td>
                    <td>{client.total_orders_count}</td>
                    <td className={styles.colActions}>
                      <div className={styles.actionsGroup}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPurchaseClient(client)}
                        >
                          Новая покупка
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Удалить клиента"
                          onClick={() => setClientToDelete(client)}
                        >
                          <span className={styles.deleteIcon} aria-hidden="true">
                            ×
                          </span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Страница {currentPageSafe} из {totalPages} · Показано{" "}
              {paginatedClients.length} из {filteredClients.length} клиентов
            </div>
            <div className={styles.paginationControls}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPageSafe === 1}
                className={styles.paginationButton}
              >
                Назад
              </Button>
              <span className={styles.paginationPageInfo}>
                {currentPageSafe} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPageSafe === totalPages}
                className={styles.paginationButton}
              >
                Вперёд
              </Button>
            </div>
          </div>
        </>
      )}

      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadClients}
      />

      <NewPurchaseModal
        isOpen={purchaseClient !== null}
        client={purchaseClient}
        onClose={() => setPurchaseClient(null)}
        onSuccess={loadClients}
      />

      <DeleteClientModal
        isOpen={clientToDelete !== null}
        client={clientToDelete}
        onClose={() => setClientToDelete(null)}
        onSuccess={loadClients}
      />
    </main>
  );
}
