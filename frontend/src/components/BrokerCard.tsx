"use client";

import Link from "next/link";
import type { Broker } from "@/types";

interface Props {
  broker: Broker;
  index: number;
  onDelete: (id: string) => void;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export default function BrokerCard({ broker, index, onDelete }: Props) {
  const isOverpayment = broker.debt < 0;
  const isZero = broker.debt === 0;

  const debtClass = isZero
    ? "debt-card__value--zero"
    : isOverpayment
    ? "debt-card__value--negative"
    : "debt-card__value--positive";

  const debtLabel = isOverpayment
    ? "Переплата"
    : isZero
    ? "Баланс"
    : "Долг";

  return (
    <Link href={`/modules/debt-management/brokers/${broker.id}`} style={{ textDecoration: "none" }}>
      <div
        className="card broker-card animate-in"
        style={{ animationDelay: `${index * 0.05}s` }}
        id={`broker-card-${broker.id}`}
      >
        <button
          className="btn btn--danger btn--sm broker-card__delete"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(broker.id);
          }}
          id={`delete-broker-${broker.id}`}
          title="Удалить"
        >
          ✕
        </button>

        <div className="broker-card__name">{broker.name}</div>
        <div className={`broker-card__debt ${debtClass}`}>
          {isOverpayment ? "−" : isZero ? "" : "+"}
          {formatAmount(broker.debt)} ₸
        </div>
        <div className="broker-card__meta">
          {debtLabel} •{" "}
          {new Date(broker.created_at).toLocaleDateString("ru-RU")}
        </div>
      </div>
    </Link>
  );
}
