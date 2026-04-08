"""PDF Receipt Parser Service.

Extracts text from PDF receipts and parses structured data using regex.
NO OCR, NO AI — only direct text extraction from PDF.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class ParsedReceipt:
    """Structured data extracted from a receipt."""

    type: str  # "payment" or "transfer"
    amount: Optional[float] = None
    datetime_str: Optional[str] = None
    parsed_datetime: Optional[datetime] = None
    receipt_number: Optional[str] = None
    party_from: Optional[str] = None
    party_to: Optional[str] = None
    party_identifier: Optional[str] = None
    kbk: Optional[str] = None
    knp: Optional[str] = None
    raw_text: str = ""
    errors: list[str] = field(default_factory=list)


class ReceiptParserService:
    """Service for extracting and parsing PDF receipt data."""

    # --- Amount patterns ---
    AMOUNT_PATTERNS = [
        # 610 000 ₸ or 610 000₸
        r"(\d[\d\s]*\d)\s*₸",
        # 24650.00 KZT
        r"(\d[\d\s]*[\.,]\d{2})\s*(?:KZT|тенге|тг)",
        # Сумма: 24 650.00 or Сумма 24650,00
        r"[Сс]умма[:\s]*(\d[\d\s]*[\.,]?\d*)",
        # Amount: 24650.00
        r"[Aa]mount[:\s]*(\d[\d\s]*[\.,]?\d*)",
    ]

    # --- Datetime patterns ---
    DATETIME_PATTERNS = [
        # 03.02.2026 15:35 or 03.02.2026 15:35:08
        r"(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}(?::\d{2})?)",
        # 07-04-2026 09:52
        r"(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}(?::\d{2})?)",
        # 2026-04-07 09:52
        r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)",
        # Дата: 03.02.2026
        r"[Дд]ата[:\s]*(\d{2}[\.\-]\d{2}[\.\-]\d{4})",
    ]

    DATETIME_FORMATS = [
        "%d.%m.%Y %H:%M",
        "%d.%m.%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%d.%m.%Y",
        "%d-%m-%Y",
    ]

    # --- Receipt number patterns ---
    RECEIPT_NUMBER_PATTERNS = [
        r"№\s*(?:квитанции|документа|чека)[:\s]*([^\n]+)",
        r"(?:Квитанция|Чек|Документ)\s*№?\s*[:\s]*([A-Za-z0-9\-]+)",
        r"(?:Receipt|Document)\s*#?\s*[:\s]*([A-Za-z0-9\-]+)",
    ]

    @staticmethod
    def extract_text(file_bytes: bytes) -> str:
        """Extract text from PDF bytes using PyMuPDF."""
        import fitz  # PyMuPDF

        text_parts: list[str] = []
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                text_parts.append(page.get_text())
            doc.close()
        except Exception as exc:
            raise ValueError(f"Failed to extract text from PDF: {exc}") from exc

        full_text = "\n".join(text_parts).strip()
        if not full_text:
            raise ValueError(
                "No text could be extracted from the PDF. "
                "The file may contain only images. Please use manual input."
            )
        return full_text

    @classmethod
    def detect_type(cls, text: str) -> str:
        """Detect receipt type based on text content.

        Returns 'payment' if КНП or КБК found, 'transfer' if sender found.
        """
        text_upper = text.upper()

        # Payment indicators
        if "КНП" in text_upper or "КБК" in text_upper:
            return "payment"

        # Transfer indicators
        if "ОТПРАВИТЕЛЬ" in text_upper or "SENDER" in text_upper:
            return "transfer"

        # Default to payment
        return "payment"

    @classmethod
    def _parse_amount(cls, text: str) -> Optional[float]:
        """Extract amount from text."""
        for pattern in cls.AMOUNT_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                raw = match.group(1).strip()
                # Remove spaces, replace comma with dot
                cleaned = raw.replace(" ", "").replace(",", ".")
                try:
                    return float(cleaned)
                except ValueError:
                    continue
        return None

    @classmethod
    def _parse_datetime(cls, text: str) -> tuple[Optional[str], Optional[datetime]]:
        """Extract datetime from text. Returns (raw_string, parsed_datetime)."""
        for pattern in cls.DATETIME_PATTERNS:
            match = re.search(pattern, text)
            if match:
                raw_dt = match.group(1).strip()
                for fmt in cls.DATETIME_FORMATS:
                    try:
                        parsed = datetime.strptime(raw_dt, fmt)
                        return raw_dt, parsed
                    except ValueError:
                        continue
                return raw_dt, None
        return None, None

    @classmethod
    def _parse_receipt_number(cls, text: str) -> Optional[str]:
        """Extract receipt number from text."""
        for pattern in cls.RECEIPT_NUMBER_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    @classmethod
    def _parse_field(cls, text: str, keywords: list[str]) -> Optional[str]:
        """Generic field extractor: find value after keyword."""
        for keyword in keywords:
            pattern = rf"{keyword}[:\s]*([^\n]+)"
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                if value:
                    return value
        return None

    @classmethod
    def parse_payment(cls, text: str) -> ParsedReceipt:
        """Parse a payment receipt."""
        result = ParsedReceipt(type="payment", raw_text=text)

        result.amount = cls._parse_amount(text)
        result.datetime_str, result.parsed_datetime = cls._parse_datetime(text)
        result.receipt_number = cls._parse_receipt_number(text)

        # Payment-specific fields
        result.party_from = cls._parse_field(
            text, ["Плательщик", "Отправитель", "Payer", "From"]
        )
        result.party_to = cls._parse_field(
            text, ["Получатель", "Бенефициар", "Receiver", "Beneficiary", "To"]
        )
        result.party_identifier = cls._parse_field(
            text, ["ИИН", "БИН", "IIN", "BIN", "ИИН/БИН"]
        )
        result.kbk = cls._parse_field(text, ["КБК", "KBK"])
        result.knp = cls._parse_field(text, ["КНП", "KNP"])

        # Validation
        if result.amount is None:
            result.errors.append("Could not extract amount")
        if result.parsed_datetime is None:
            result.errors.append("Could not extract date/time")

        return result

    @classmethod
    def parse_transfer(cls, text: str) -> ParsedReceipt:
        """Parse a transfer receipt."""
        result = ParsedReceipt(type="transfer", raw_text=text)

        result.amount = cls._parse_amount(text)
        result.datetime_str, result.parsed_datetime = cls._parse_datetime(text)
        result.receipt_number = cls._parse_receipt_number(text)

        # Transfer-specific fields
        result.party_from = cls._parse_field(
            text, ["Отправитель", "Sender", "From", "Плательщик"]
        )
        result.party_to = cls._parse_field(
            text, ["Получатель", "Receiver", "To", "Бенефициар"]
        )

        # Validation
        if result.amount is None:
            result.errors.append("Could not extract amount")
        if result.parsed_datetime is None:
            result.errors.append("Could not extract date/time")

        return result

    @classmethod
    def parse(cls, file_bytes: bytes) -> ParsedReceipt:
        """Full pipeline: extract text → detect type → parse."""
        text = cls.extract_text(file_bytes)
        receipt_type = cls.detect_type(text)

        if receipt_type == "payment":
            return cls.parse_payment(text)
        else:
            return cls.parse_transfer(text)
