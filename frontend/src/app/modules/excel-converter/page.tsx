"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { ConverterPreview, ConverterProcessResult, AggregationRule } from "@/types";
import { converterPreview, converterProcess, converterDownload } from "@/lib/api";
import ModuleGuard from "@/components/ModuleGuard";

type Step = "upload" | "configure" | "result";

const RULE_LABELS: Record<AggregationRule, string> = {
  sum: "Суммировать",
  unique_join: "Уникальные через запятую",
  first: "Первое значение",
  count: "Кол-во строк",
  skip: "Пропустить",
};

function ConverterContent() {
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<ConverterPreview | null>(null);
  const [result, setResult] = useState<ConverterProcessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  // Configuration
  const [groupByColumn, setGroupByColumn] = useState<string>("");
  const [columnRules, setColumnRules] = useState<Record<string, AggregationRule>>({});

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    setFileName(file.name);

    try {
      const data = await converterPreview(file);
      setPreview(data);

      // Auto-configure rules based on detected types
      const rules: Record<string, AggregationRule> = {};
      data.columns.forEach((col) => {
        const lowerCol = col.toLowerCase();
        if (lowerCol.includes("price") || lowerCol.includes("цена")) {
          rules[col] = "unique_join";
        } else {
          rules[col] = data.column_types[col] === "numeric" ? "sum" : "unique_join";
        }
      });
      setColumnRules(rules);

      // Smart auto-detect HS Code / ТН ВЭД column for grouping
      const defaultGroupCol = data.columns.find(
        (col) => col.toLowerCase().includes("hs code") || col.toLowerCase().includes("тн вэд")
      ) || data.columns[0] || "";
      setGroupByColumn(defaultGroupCol);
      
      setStep("configure");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleProcess = async () => {
    setError(null);
    setLoading(true);

    try {
      const data = await converterProcess(groupByColumn, columnRules);
      setResult(data);
      setStep("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setError(null);
    setLoading(true);

    try {
      await converterDownload(groupByColumn, columnRules);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setPreview(null);
    setResult(null);
    setGroupByColumn("");
    setColumnRules({});
    setFileName("");
    setError(null);
  };

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header__inner">
          <div className="header__logo">
            <Link href="/" className="back-link" style={{ marginRight: "var(--space-sm)" }}>
              ←
            </Link>
            <div
              className="header__logo-icon"
              style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
            >
              📑
            </div>
            <div>
              <div className="header__title">Excel Конвертер</div>
              <div className="header__subtitle">Группировка данных</div>
            </div>
          </div>
          {step !== "upload" && (
            <button className="btn btn--ghost" onClick={handleReset}>
              🔄 Начать заново
            </button>
          )}
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="toast toast--error" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="converter-step">
          <div
            className="file-upload"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".xlsx,.xls";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFileUpload(file);
              };
              input.click();
            }}
            id="file-upload-zone"
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span className="file-upload__text">Обработка...</span>
              </>
            ) : (
              <>
                <div className="file-upload__icon">📁</div>
                <div className="file-upload__text">
                  Перетащите Excel файл сюда или нажмите для выбора
                </div>
                <div className="file-upload__hint">
                  Поддерживается .xlsx, .xls (до 5 МБ)
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === "configure" && preview && (
        <div className="converter-step">
          {/* Input preview */}
          <div className="converter-section">
            <h3 className="converter-section__title">
              📋 Входные данные: {fileName}
              <span className="converter-section__count">{preview.row_count} строк</span>
            </h3>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {preview.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sample_rows.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.row_count > 10 && (
              <div className="data-table-more">
                ... и ещё {preview.row_count - 10} строк
              </div>
            )}
          </div>

          {/* Configuration */}
          <div className="converter-section">
            <h3 className="converter-section__title">⚙️ Настройка группировки</h3>

            <div className="form-group">
              <label className="form-label">Колонка для группировки</label>
              <select
                className="form-input"
                value={groupByColumn}
                onChange={(e) => setGroupByColumn(e.target.value)}
                id="group-by-select"
              >
                {preview.columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div className="rules-grid">
              {preview.columns
                .filter((col) => col !== groupByColumn)
                .map((col) => (
                  <div key={col} className="rule-item">
                    <div className="rule-item__name">
                      {col}
                      <span className="rule-item__type">
                        {preview.column_types[col] === "numeric" ? "🔢" : "📝"}
                      </span>
                    </div>
                    <select
                      className="form-input"
                      value={columnRules[col] || "unique_join"}
                      onChange={(e) =>
                        setColumnRules((prev) => ({
                          ...prev,
                          [col]: e.target.value as AggregationRule,
                        }))
                      }
                    >
                      {Object.entries(RULE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>

            <button
              className="btn btn--primary btn--lg"
              onClick={handleProcess}
              disabled={loading || !groupByColumn}
              style={{ marginTop: "var(--space-lg)" }}
              id="process-btn"
            >
              {loading ? <span className="spinner" /> : "Обработать →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === "result" && result && (
        <div className="converter-step">
          <div className="converter-section">
            <h3 className="converter-section__title">
              ✅ Результат
            </h3>
            <div className="converter-stats">
              <div className="converter-stat">
                <span className="converter-stat__label">Было строк</span>
                <span className="converter-stat__value">{result.original_count}</span>
              </div>
              <div className="converter-stat converter-stat--arrow">→</div>
              <div className="converter-stat">
                <span className="converter-stat__label">Стало строк</span>
                <span className="converter-stat__value converter-stat__value--success">
                  {result.grouped_count}
                </span>
              </div>
              <div className="converter-stat">
                <span className="converter-stat__label">Сжатие</span>
                <span className="converter-stat__value converter-stat__value--accent">
                  {Math.round((1 - result.grouped_count / result.original_count) * 100)}%
                </span>
              </div>
            </div>

            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {result.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.preview_rows.slice(0, 20).map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{String(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.grouped_count > 20 && (
              <div className="data-table-more">
                ... и ещё {result.grouped_count - 20} строк
              </div>
            )}
          </div>

          <div className="converter-actions">
            <button
              className="btn btn--primary btn--lg"
              onClick={handleDownload}
              disabled={loading}
              id="download-btn"
            >
              {loading ? <span className="spinner" /> : "📥 Скачать Excel"}
            </button>
            <button className="btn btn--ghost btn--lg" onClick={handleReset}>
              🔄 Начать заново
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExcelConverterPage() {
  return (
    <ModuleGuard moduleId="excel_converter">
      <ConverterContent />
    </ModuleGuard>
  );
}
