"""
Phase 1: PDF text extraction using pypdf.
Simple, zero-dependency, works on all platforms.

Known limitation: complex multi-column layouts may lose ordering.
Phase 2 will upgrade to `unstructured` for better layout handling.
"""
import io
from pypdf import PdfReader


class ExtractionError(Exception):
    pass


def extract_text(file_bytes: bytes) -> str:
    """
    Extract raw text from PDF bytes.
    Returns cleaned text string.
    Raises ExtractionError if PDF is unreadable or empty.
    """
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception as e:
        raise ExtractionError(f"Could not open PDF: {e}")

    if len(reader.pages) == 0:
        raise ExtractionError("PDF has no pages")

    pages_text: list[str] = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages_text.append(text)

    full_text = "\n\n".join(pages_text).strip()

    if len(full_text) < 50:
        raise ExtractionError(
            "Could not extract readable text. "
            "The PDF may be image-based (scanned). "
            "Phase 2 will add OCR support."
        )

    return _clean(full_text)


def _clean(text: str) -> str:
    """Remove excessive whitespace while preserving structure."""
    lines = [line.strip() for line in text.splitlines()]
    # Collapse more than 2 consecutive blank lines into 1
    cleaned: list[str] = []
    blanks = 0
    for line in lines:
        if line == "":
            blanks += 1
            if blanks <= 1:
                cleaned.append(line)
        else:
            blanks = 0
            cleaned.append(line)
    return "\n".join(cleaned)
