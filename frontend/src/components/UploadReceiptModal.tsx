"use client";

import { useState } from "react";
import type { ReceiptParseResult } from "@/types";
import { uploadReceipt, createTransaction } from "@/lib/api";
import ReceiptPreview from "@/components/ReceiptPreview";

interface Props {
  brokerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadReceiptModal({
  brokerId,
  onClose,
  onSuccess,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<ReceiptParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith(".pdf")) {
        setError("Только PDF файлы");
        return;
      }
      setFile(selected);
      setPreview(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setUploading(true);
      setError(null);
      const result = await uploadReceipt(file);
      setPreview(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (data: ReceiptParseResult) => {
    if (!data.amount || data.amount <= 0) {
      setError("Сумма должна быть больше 0");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await createTransaction({
        broker_id: brokerId,
        type: data.type,
        amount: data.amount,
        datetime: data.datetime || new Date().toISOString(),
        receipt_number: data.receipt_number || undefined,
        party_from: data.party_from || undefined,
        party_to: data.party_to || undefined,
        party_identifier: data.party_identifier || undefined,
        kbk: data.kbk || undefined,
        knp: data.knp || undefined,
        source: "receipt",
        raw_text: data.raw_text || undefined,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: "600px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">📄 Загрузить чек (PDF)</h2>
          <button className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="receipt-preview__errors">{error}</div>}

        {/* File Upload */}
        {!preview && (
          <>
            <label className="file-upload" htmlFor="receipt-file-input">
              <div className="file-upload__icon">📁</div>
              <div className="file-upload__text">
                {file ? file.name : "Выберите PDF файл"}
              </div>
              <div className="file-upload__hint">
                Только PDF • Текстовые квитанции
              </div>
              <input
                id="receipt-file-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>

            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={onClose}>
                Отмена
              </button>
              <button
                className="btn btn--primary"
                onClick={handleUpload}
                disabled={!file || uploading}
                id="upload-receipt-confirm-btn"
              >
                {uploading ? <span className="spinner" /> : "Загрузить"}
              </button>
            </div>
          </>
        )}

        {/* Preview & Edit */}
        {preview && (
          <ReceiptPreview
            data={preview}
            onSave={handleSave}
            onCancel={() => {
              setPreview(null);
              setFile(null);
            }}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
