"""API routes for Excel Converter module."""

from __future__ import annotations

import logging
import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from pydantic import BaseModel

from app.infrastructure.auth_middleware import require_module
from app.infrastructure.models import UserProfileModel
from app.application.excel_converter_service import ExcelConverterService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/converter", tags=["Excel Converter"])

MODULE_ID = "excel_converter"


# --- Schemas ---

class PreviewResponse(BaseModel):
    columns: list[str]
    sample_rows: list[list[str]]
    row_count: int
    column_types: dict[str, str]


class ProcessRequest(BaseModel):
    group_by_column: str
    column_rules: dict[str, str]  # {"col": "sum" | "unique_join" | "first" | "count" | "skip"}


class ProcessResponse(BaseModel):
    columns: list[str]
    preview_rows: list[list]
    original_count: int
    grouped_count: int


# --- In-memory file storage (per-request, cleaned up automatically) ---
# We store the last uploaded file bytes in a simple dict keyed by user ID.
# This avoids re-uploading for process/download after preview.
_user_files: dict[str, bytes] = {}

MAX_STORED_FILES = 50  # Prevent memory leak


def _store_file(user_id: str, file_bytes: bytes) -> None:
    """Store file bytes for a user, evicting oldest if needed."""
    if len(_user_files) >= MAX_STORED_FILES:
        # Remove oldest entry
        oldest_key = next(iter(_user_files))
        del _user_files[oldest_key]
    _user_files[user_id] = file_bytes


def _get_file(user_id: str) -> bytes | None:
    """Get stored file bytes for a user."""
    return _user_files.get(user_id)


def _clear_file(user_id: str) -> None:
    """Clear stored file for a user."""
    _user_files.pop(user_id, None)


# --- Endpoints ---

@router.post("/preview", response_model=PreviewResponse)
async def preview_input(
    file: UploadFile = File(...),
    user: UserProfileModel = Depends(require_module(MODULE_ID)),
):
    """Upload Excel file and return column info + preview data."""
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Only .xlsx and .xls files are supported",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        result = ExcelConverterService.preview_input(file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Store for later processing
    _store_file(str(user.id), file_bytes)

    return PreviewResponse(**result)


@router.post("/process", response_model=ProcessResponse)
async def process_file(
    body: ProcessRequest,
    user: UserProfileModel = Depends(require_module(MODULE_ID)),
):
    """Process the previously uploaded file with grouping rules."""
    file_bytes = _get_file(str(user.id))
    if file_bytes is None:
        raise HTTPException(
            status_code=400,
            detail="No file uploaded. Please upload a file first via /converter/preview",
        )

    try:
        result = ExcelConverterService.process(
            file_bytes=file_bytes,
            group_by_column=body.group_by_column,
            column_rules=body.column_rules,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return ProcessResponse(
        columns=result["columns"],
        preview_rows=result["preview_rows"],
        original_count=result["original_count"],
        grouped_count=result["grouped_count"],
    )


@router.post("/download")
async def download_result(
    body: ProcessRequest,
    user: UserProfileModel = Depends(require_module(MODULE_ID)),
):
    """Process and download the grouped Excel file."""
    file_bytes = _get_file(str(user.id))
    if file_bytes is None:
        raise HTTPException(
            status_code=400,
            detail="No file uploaded. Please upload a file first via /converter/preview",
        )

    try:
        result = ExcelConverterService.process(
            file_bytes=file_bytes,
            group_by_column=body.group_by_column,
            column_rules=body.column_rules,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Generate Excel
    excel_bytes = ExcelConverterService.generate_output_excel(
        columns=result["columns"],
        rows=result["grouped_rows"],
    )

    # Clean up stored file
    _clear_file(str(user.id))

    filename = "grouped_result.xlsx"
    encoded_filename = urllib.parse.quote(filename)

    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
    }
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@router.delete("/clear")
async def clear_uploaded_file(
    user: UserProfileModel = Depends(require_module(MODULE_ID)),
):
    """Clear the stored uploaded file for the current user."""
    _clear_file(str(user.id))
    return {"status": "cleared"}
