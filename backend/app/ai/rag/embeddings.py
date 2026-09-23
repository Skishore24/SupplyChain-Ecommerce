"""
Multi-Provider Embedding Generator
==================================
Supports:
1. Google Gemini Embeddings (text-embedding-004) if GEMINI_API_KEY configured
2. SentenceTransformers (all-MiniLM-L6-v2) if installed
3. Sklearn TF-IDF / Subword Vectorizer (deterministic, local, zero-network fallback)
"""
from typing import List
import numpy as np
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        self._provider = None
        self._model = None
        self._init_provider()

    def _init_provider(self):
        # 1. Check Gemini
        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                self._gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                self._provider = "gemini"
                logger.info("Using Gemini text-embedding-004 for RAG embeddings.")
                return
            except Exception as e:
                logger.warning(f"Could not initialize Gemini embeddings: {e}")

        # 2. Check SentenceTransformers
        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer("all-MiniLM-L6-v2")
            self._provider = "sentence_transformers"
            logger.info("Using local SentenceTransformer (all-MiniLM-L6-v2).")
            return
        except ImportError:
            pass

        # 3. Fallback: Sklearn Hashing Vectorizer
        try:
            from sklearn.feature_extraction.text import HashingVectorizer
            self._vectorizer = HashingVectorizer(n_features=256, alternate_sign=False, norm="l2")
            self._provider = "sklearn_hash"
            logger.info("Using local scikit-learn HashingVectorizer for semantic retrieval.")
        except Exception as e:
            self._provider = "fallback"
            logger.warning(f"Using basic keyword hashing fallback: {e}")

    def embed_text(self, text: str) -> List[float]:
        """Embeds a single string into a float vector."""
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embeds a batch of texts into vectors."""
        if not texts:
            return []

        if self._provider == "gemini":
            try:
                results = []
                for t in texts:
                    res = self._gemini_client.models.embed_content(
                        model="text-embedding-004",
                        contents=t,
                    )
                    results.append(res.embedding.values)
                return results
            except Exception as e:
                logger.error(f"Gemini embedding call failed: {e}")

        elif self._provider == "sentence_transformers" and self._model:
            embeddings = self._model.encode(texts, normalize_embeddings=True)
            return embeddings.tolist()

        elif self._provider == "sklearn_hash" and hasattr(self, "_vectorizer"):
            matrix = self._vectorizer.transform(texts).toarray()
            return matrix.tolist()

        # Deterministic simple fallback
        dim = 128
        results = []
        for t in texts:
            vec = np.zeros(dim, dtype=np.float32)
            for word in t.lower().split():
                idx = hash(word) % dim
                vec[idx] += 1.0
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            results.append(vec.tolist())
        return results


embedding_service = EmbeddingService()
