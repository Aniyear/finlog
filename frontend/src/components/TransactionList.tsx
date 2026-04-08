"use client";

import type { Transaction } from "@/types";

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  accrual: "Начисление",
  payment: "Оплата",
  transfer: "Перевод",
  cash: "Наличные",
};

const TYPE_ICONS: Record<string, string> = {
  accrual: "📝",
  payment: "💳",
  transfer: "🔄",
  cash: "💵",
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TransactionList({ transactions, onDelete }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📋</div>
        <p className="empty-state__text">Нет операций</p>
      </div>
    );
  }

  return (
    <div className="tx-list">
      {transactions.map((tx, i) => {
        const isAccrual = tx.type === "accrual";
        const subtitle = [
          tx.receipt_number && `№ ${tx.receipt_number}`,
          tx.party_from && `от: ${tx.party_from}`,
          tx.comment,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <div
            key={tx.id}
            className="tx-item animate-in"
            style={{ animationDelay: `${i * 0.03}s` }}
            id={`tx-item-${tx.id}`}
          >
            <div
              className={`tx-item__type tx-item__type--${tx.type}`}
            >
              {TYPE_ICONS[tx.type]}
            </div>

            <div className="tx-item__info">
              <div className="tx-item__title">
                {TYPE_LABELS[tx.type]}
                {tx.source === "receipt" && " 📄"}
              </div>
              <div className="tx-item__subtitle">
                {formatDate(tx.datetime)}
                {subtitle ? ` · ${subtitle}` : ""}
              </div>
            </div>

            <div
              className={`tx-item__amount ${
                isAccrual
                  ? "tx-item__amount--positive"
                  : "tx-item__amount--negative"
              }`}
            >
              {isAccrual ? "+" : "−"}{formatAmount(tx.amount)} ₸
            </div>

            <button
              className="btn btn--danger btn--sm tx-item__delete"
              onClick={() => onDelete(tx.id)}
              title="Удалить"
              id={`delete-tx-${tx.id}`}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
