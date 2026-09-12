from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd


SUPPORTED_EXTENSIONS = {
    ".csv",
    ".xlsx",
    ".xls",
}


def load_file(path: str | Path) -> list[dict[str, Any]]:
    file_path = Path(path)

    if not file_path.exists():
        raise FileNotFoundError(
            f"Dataset file not found: {file_path}"
        )

    extension = file_path.suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type: {extension}. "
            f"Supported types: {sorted(SUPPORTED_EXTENSIONS)}"
        )

    if extension == ".csv":
        dataframe = pd.read_csv(file_path)

    elif extension in {".xlsx", ".xls"}:
        dataframe = pd.read_excel(file_path)

    else:
        raise ValueError(
            f"Unsupported file type: {extension}"
        )

    # Normalize column names.
    dataframe.columns = [
        str(column).strip()
        for column in dataframe.columns
    ]

    # Convert pandas NaN/NaT into Python None.
    dataframe = dataframe.astype(object).where(
        dataframe.notna(),
        None,
    )

    records = dataframe.to_dict(
        orient="records"
    )

    return records


def get_file_metadata(
    path: str | Path,
) -> dict[str, Any]:
    file_path = Path(path)

    if not file_path.exists():
        raise FileNotFoundError(
            f"Dataset file not found: {file_path}"
        )

    extension = file_path.suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type: {extension}"
        )

    return {
        "file_name": file_path.name,
        "file_extension": extension,
        "file_size_bytes": file_path.stat().st_size,
    }