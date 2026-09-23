"""
RAG Document Chunker
====================
Splits documents into coherent chunks with overlap, respecting paragraph
and sentence boundaries for optimal semantic retrieval.
"""
from typing import List, Dict, Any
import re


def chunk_text(
    text: str,
    chunk_size: int = 600,
    chunk_overlap: int = 100,
) -> List[Dict[str, Any]]:
    """
    Splits text into chunks of approximately chunk_size characters with overlap.
    Preserves paragraph breaks where possible.
    """
    if not text or not text.strip():
        return []

    # Clean text
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks = []
    current_chunk = []
    current_len = 0
    chunk_index = 0

    for paragraph in paragraphs:
        p_len = len(paragraph)

        # If a single paragraph is larger than chunk_size, split by sentences
        if p_len > chunk_size:
            sentences = re.split(r"(?<=[.!?])\s+", paragraph)
            for sentence in sentences:
                s_len = len(sentence)
                if current_len + s_len > chunk_size and current_chunk:
                    chunk_str = " ".join(current_chunk).strip()
                    chunks.append({
                        "chunk_index": chunk_index,
                        "content": chunk_str,
                        "char_count": len(chunk_str),
                    })
                    chunk_index += 1
                    # Retain last elements for overlap
                    overlap_chars = 0
                    new_current = []
                    for item in reversed(current_chunk):
                        if overlap_chars + len(item) < chunk_overlap:
                            new_current.insert(0, item)
                            overlap_chars += len(item)
                        else:
                            break
                    current_chunk = new_current
                    current_len = sum(len(x) for x in current_chunk)

                current_chunk.append(sentence)
                current_len += s_len
        else:
            if current_len + p_len > chunk_size and current_chunk:
                chunk_str = "\n\n".join(current_chunk).strip()
                chunks.append({
                    "chunk_index": chunk_index,
                    "content": chunk_str,
                    "char_count": len(chunk_str),
                })
                chunk_index += 1
                current_chunk = [paragraph]
                current_len = p_len
            else:
                current_chunk.append(paragraph)
                current_len += p_len

    if current_chunk:
        chunk_str = "\n\n".join(current_chunk).strip()
        chunks.append({
            "chunk_index": chunk_index,
            "content": chunk_str,
            "char_count": len(chunk_str),
        })

    return chunks
