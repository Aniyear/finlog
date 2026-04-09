"""API routes for Excel Converter module."""

from __future__ import annotations

import logging
import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from pydantic import BaseModel

from app.infrastructure.auth_middleware import require_module
from app.infrastructure.models import UserProfileModel
from app.application.excel_converter_service import ExcelConverterService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/converter", tags=["Excel Converter"])

MODULE_ID = "excel_converter"


# --- Schemas ---

class PreviewResponse(BaseModel):
    sheets: list[str]
    current_sheet: str
    columns: list[str]
    sample_rows: list[list[str]]
    row_count: int
    column_types: dict[str, str]


class ProcessResponse(BaseModel):
    columns: list[str]
    preview_rows: list[list]
    original_count: int
    grouped_count: int


# --- Endpoints ---

@router.post("/preview", response_model=PreviewResponse)
async def preview_input(
    file: UploadFile = File(...),
    sheet_name: str | None = Form(None),
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
        result = ExcelConverterService.preview_input(file_bytes, sheet_name=sheet_name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return PreviewResponse(**result)


@router.post("/process", response_model=ProcessResponse)
async def process_file(
    file: UploadFile = File(...),
    group_by_column: str = Form(...),
    column_rules: str = Form(...),  # JSON string
    sheet_name: str | None = Form(None),
    user: UserProfileModel = Depends(require_module(MODULE_ID)),
):
    """Process an uploaded file with grouping rules (Stateless)."""
    import json
    try:
        rules_dict = json.loads(column_rules)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON in column_rules")

    file_bytes = await file.read()
    try:
        result = ExcelConverterService.process(
            file_bytes=file_bytes,
            group_by_column=group_by_column,
            column_rules=rules_dict,
            sheet_name=sheet_name,
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
    file: UploadFile = File(...),
    group_by_column: str = Form(...),
    column_rules: str = Form(...),  # JSON string
    sheet_name: str | None = Form(None),
    user: UserProfileModel = Depends(require_module(MODULE_ID)),
):
    """Process and download the grouped Excel file (Stateless)."""
    import json
    try:
        rules_dict = json.loads(column_rules)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON in column_rules")

    file_bytes = await file.read()
    try:
        result = ExcelConverterService.process(
            file_bytes=file_bytes,
            group_by_column=group_by_column,
            column_rules=rules_dict,
            sheet_name=sheet_name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Generate Excel
    excel_bytes = ExcelConverterService.generate_output_excel(
        columns=result["columns"],
        rows=result["grouped_rows"],
    )

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
