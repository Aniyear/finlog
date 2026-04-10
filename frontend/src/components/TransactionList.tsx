"use client";

import { useState } from "react";
import type { Transaction } from "@/types";

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
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
    hour12: false,
  });
}

export default function TransactionList({ 
  transactions, 
  onDelete, 
  selectedIds, 
  onSelectionChange 
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📋</div>
        <p className="empty-state__text">Нет операций</p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(transactions.map(tx => tx.id));
    } else {
      onSelectionChange([]);
    }
  };

  const allSelected = transactions.length > 0 && selectedIds.length === transactions.length;

  return (
    <div className="tx-list">
      {/* Table Header for Select All */}
      <div className="tx-list-header" style={{
        display: 'flex', 
        alignItems: 'center', 
        padding: '8px 16px',
        color: 'var(--text-secondary)',
        fontSize: '0.8rem',
        textTransform: 'uppercase',
        letterSpacing: '0.025em'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
          <input 
            type="checkbox" 
            checked={allSelected} 
            onChange={(e) => handleSelectAll(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          Выбрать все
        </label>
      </div>

      {transactions.map((tx, i) => {
        const isAccrual = tx.type === "accrual";
        const isExpanded = expandedId === tx.id;
        const isSelected = selectedIds.includes(tx.id);
        
        // Short subtitle for collapsed view
        const subtitle = [
          tx.receipt_number && `№ ${tx.receipt_number}`,
          tx.party_from && `от: ${tx.party_from}`,
        ].filter(Boolean).join(" · ");

        return (
          <div
            key={tx.id}
            className={`card animate-in ${isSelected ? 'selected' : ''}`}
            style={{ 
              animationDelay: `${i * 0.03}s`, 
              marginBottom: '12px', 
              padding: 0, 
              overflow: 'hidden',
              border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: isSelected ? 'rgba(13, 148, 136, 0.05)' : 'var(--card-bg)'
            }}
            id={`tx-item-${tx.id}`}
          >
            {/* Row Layout with Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ paddingLeft: '16px' }}>
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  onChange={(e) => handleSelectOne(tx.id, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Clickable Header Area */}
              <div 
                className="tx-item" 
                onClick={() => toggleExpand(tx.id)} 
                style={{ flex: 1, padding: '16px', background: 'transparent', margin: 0, cursor: 'pointer', border: 'none' }}
              >
                <div className={`tx-item__type tx-item__type--${tx.type}`}>
                  {TYPE_ICONS[tx.type]}
                </div>

                <div className="tx-item__info">
                  <div className="tx-item__title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {TYPE_LABELS[tx.type]}
                    {tx.source === "receipt" && <span title="Из чека">📄</span>}
                  </div>
                  <div className="tx-item__subtitle">
                    {formatDate(tx.datetime)}
                    {subtitle ? ` · ${subtitle}` : ""}
                  </div>
                </div>

                <div
                  className={`tx-item__amount ${
                    isAccrual ? "tx-item__amount--positive" : "tx-item__amount--negative"
                  }`}
                >
                  {isAccrual ? "+" : "−"}{formatAmount(tx.amount)} ₸
                </div>

                <button
                  className="btn btn--danger btn--sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(tx.id);
                  }}
                  title="Удалить"
                  id={`delete-tx-${tx.id}`}
                  style={{ marginLeft: '12px' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div 
                className="tx-details animate-in" 
                style={{ padding: '0 16px 16px 82px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}
              >
                {tx.party_from && <div style={{ marginBottom: '4px' }}><strong>Отправитель:</strong> {tx.party_from}</div>}
                {tx.party_to && <div style={{ marginBottom: '4px' }}><strong>Получатель:</strong> {tx.party_to}</div>}
                {tx.kbk && <div style={{ marginBottom: '4px' }}><strong>КБК:</strong> {tx.kbk}</div>}
                {tx.knp && <div style={{ marginBottom: '4px' }}><strong>КНП:</strong> {tx.knp}</div>}
                {tx.receipt_number && <div style={{ marginBottom: '4px' }}><strong>№ чека:</strong> {tx.receipt_number}</div>}
                {tx.comment && <div style={{ marginBottom: '4px' }}><strong>Комментарий:</strong> {tx.comment}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
