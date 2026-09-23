"""
RAG Knowledge Retriever
=======================
Indexes knowledge documents and performs semantic vector search
with cosine similarity scoring and metadata filtering.
"""
from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session

from app.models.ai_models import KnowledgeDocument, KnowledgeChunk, DocumentStatusEnum
from app.ai.rag.chunker import chunk_text
from app.ai.rag.embeddings import embedding_service
import logging

logger = logging.getLogger(__name__)


def index_document(db: Session, doc_id: int, content: str) -> int:
    """
    Chunks, embeds, and indexes document content into KnowledgeChunks.
    Returns the count of created chunks.
    """
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
    if not doc:
        return 0

    chunks_data = chunk_text(content, chunk_size=500, chunk_overlap=80)
    if not chunks_data:
        return 0

    texts = [c["content"] for c in chunks_data]
    embeddings = embedding_service.embed_batch(texts)

    # Delete any existing chunks for this document
    db.query(KnowledgeChunk).filter(KnowledgeChunk.document_id == doc_id).delete()

    created_chunks = []
    for c_info, emb in zip(chunks_data, embeddings):
        chunk = KnowledgeChunk(
            document_id=doc_id,
            chunk_index=c_info["chunk_index"],
            content=c_info["content"],
            char_count=c_info["char_count"],
            embedding_vector_id=f"chunk_{doc_id}_{c_info['chunk_index']}",
            chunk_metadata={"embedding": emb},
        )
        db.add(chunk)
        created_chunks.append(chunk)

    doc.chunk_count = len(created_chunks)
    doc.status = DocumentStatusEnum.INDEXED
    db.commit()
    logger.info(f"Successfully indexed document #{doc_id} into {len(created_chunks)} chunks.")
    return len(created_chunks)


def search_knowledge_base(
    db: Session,
    query: str,
    top_k: int = 5,
    doc_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieves the top_k most semantically relevant knowledge chunks for a query.
    Calculates cosine similarity between query embedding and stored chunk vectors.
    """
    if not query or not query.strip():
        return []

    q_vec = np.array(embedding_service.embed_text(query), dtype=np.float32)
    q_norm = np.linalg.norm(q_vec)
    if q_norm == 0:
        return []
    q_vec = q_vec / q_norm

    # Query all active chunks
    query_chunks = db.query(KnowledgeChunk).join(KnowledgeDocument)
    if doc_type:
        query_chunks = query_chunks.filter(KnowledgeDocument.doc_type == doc_type)

    chunks = query_chunks.all()
    if not chunks:
        return []

    scored_results = []
    for chunk in chunks:
        emb = (chunk.chunk_metadata or {}).get("embedding")
        if not emb:
            continue
        c_vec = np.array(emb, dtype=np.float32)
        c_norm = np.linalg.norm(c_vec)
        if c_norm == 0:
            continue
        c_vec = c_vec / c_norm

        sim = float(np.dot(q_vec, c_vec))
        scored_results.append((sim, chunk))

    # Sort descending by similarity
    scored_results.sort(key=lambda x: x[0], reverse=True)

    top_results = []
    for score, chunk in scored_results[:top_k]:
        top_results.append({
            "chunk_id": chunk.id,
            "document_id": chunk.document_id,
            "document_title": chunk.document.title if chunk.document else "Unknown",
            "doc_type": chunk.document.doc_type.value if hasattr(chunk.document.doc_type, "value") else str(chunk.document.doc_type),
            "content": chunk.content,
            "similarity": round(score, 4),
        })

    return top_results
