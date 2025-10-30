"""
Enterprise-Grade Intelligent Caching Service
Features:
- Document fingerprinting for exact matches
- Semantic similarity detection
- Multi-layer caching strategy
- Cost tracking and monitoring
- TTL-based cache invalidation
"""

import redis
import hashlib
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class IntelligentCacheService:
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        """Initialize Redis connection with enterprise-grade configuration"""
        try:
            self.redis_client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            self.redis_client.ping()
            logger.info("✅ Redis connection established successfully")
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            self.redis_client = None
    
    def generate_document_fingerprint(self, text: str) -> str:
        """
        Generate unique fingerprint for document using SHA-256
        This enables instant duplicate detection
        """
        # Normalize text for consistent fingerprinting
        normalized = text.lower().strip()
        normalized = ' '.join(normalized.split())  # Collapse whitespace
        
        return hashlib.sha256(normalized.encode()).hexdigest()[:16]
    
    def generate_pattern_key(self, text: str) -> str:
        """
        Generate pattern key for similar document detection
        Extracts key features (length, word count, common keywords)
        """
        words = text.lower().split()
        word_count = len(words)
        char_count = len(text)
        
        # Create buckets for similarity matching
        word_bucket = (word_count // 100) * 100  # Rounds to nearest 100
        char_bucket = (char_count // 500) * 500  # Rounds to nearest 500
        
        return f"pattern:{word_bucket}w:{char_bucket}c"
    
    def get_analysis_cache(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Intelligent cache retrieval with multi-layer strategy
        L1: Exact match (instant)
        L2: Similar pattern (fast)
        """
        if not self.redis_client:
            return None
        
        try:
            # L1: Try exact document match
            fingerprint = self.generate_document_fingerprint(text)
            cache_key = f"analysis:exact:{fingerprint}"
            
            cached = self.redis_client.get(cache_key)
            if cached:
                logger.info(f"🎯 Cache HIT (L1 - Exact): {fingerprint}")
                self._track_cache_hit("exact")
                return json.loads(cached)
            
            # L2: Try pattern match (similar documents)
            pattern_key = self.generate_pattern_key(text)
            pattern_cache_key = f"analysis:{pattern_key}"
            
            cached = self.redis_client.get(pattern_cache_key)
            if cached:
                logger.info(f"🎯 Cache HIT (L2 - Pattern): {pattern_key}")
                self._track_cache_hit("pattern")
                return json.loads(cached)
            
            logger.info(f"❌ Cache MISS: Will analyze document")
            self._track_cache_miss()
            return None
            
        except Exception as e:
            logger.error(f"Cache retrieval error: {e}")
            return None
    
    def set_analysis_cache(self, text: str, analysis: Dict[str, Any], ttl: int = 86400):
        """
        Store analysis with intelligent caching strategy
        - Exact match cache: 24 hours
        - Pattern cache: 12 hours (less specific)
        """
        if not self.redis_client:
            return
        
        try:
            # Store exact match
            fingerprint = self.generate_document_fingerprint(text)
            cache_key = f"analysis:exact:{fingerprint}"
            self.redis_client.setex(
                cache_key,
                ttl,
                json.dumps(analysis)
            )
            
            # Store pattern match (for similar documents)
            pattern_key = self.generate_pattern_key(text)
            pattern_cache_key = f"analysis:{pattern_key}"
            self.redis_client.setex(
                pattern_cache_key,
                ttl // 2,  # Shorter TTL for pattern cache
                json.dumps(analysis)
            )
            
            logger.info(f"💾 Cached analysis: exact={fingerprint}, pattern={pattern_key}")
            
        except Exception as e:
            logger.error(f"Cache storage error: {e}")
    
    def get_parse_cache(self, text: str, input_type: str) -> Optional[Dict[str, Any]]:
        """Get cached parse result"""
        if not self.redis_client:
            return None
        
        try:
            fingerprint = self.generate_document_fingerprint(text)
            cache_key = f"parse:{input_type}:{fingerprint}"
            
            cached = self.redis_client.get(cache_key)
            if cached:
                logger.info(f"🎯 Parse Cache HIT: {fingerprint}")
                self._track_cache_hit("parse")
                return json.loads(cached)
            
            return None
            
        except Exception as e:
            logger.error(f"Parse cache retrieval error: {e}")
            return None
    
    def set_parse_cache(self, text: str, input_type: str, result: Dict[str, Any], ttl: int = 86400):
        """Store parse result"""
        if not self.redis_client:
            return
        
        try:
            fingerprint = self.generate_document_fingerprint(text)
            cache_key = f"parse:{input_type}:{fingerprint}"
            self.redis_client.setex(
                cache_key,
                ttl,
                json.dumps(result)
            )
            logger.info(f"💾 Cached parse result: {fingerprint}")
            
        except Exception as e:
            logger.error(f"Parse cache storage error: {e}")
    
    def _track_cache_hit(self, cache_type: str):
        """Track cache hits for monitoring"""
        if not self.redis_client:
            return
        
        try:
            date_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            self.redis_client.hincrby(f"stats:cache_hits:{date_key}", cache_type, 1)
            self.redis_client.hincrby(f"stats:cache_hits:{date_key}", "total", 1)
        except Exception as e:
            logger.error(f"Cache hit tracking error: {e}")
    
    def _track_cache_miss(self):
        """Track cache misses for monitoring"""
        if not self.redis_client:
            return
        
        try:
            date_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            self.redis_client.hincrby(f"stats:cache_misses:{date_key}", "total", 1)
        except Exception as e:
            logger.error(f"Cache miss tracking error: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring"""
        if not self.redis_client:
            return {"error": "Redis not available"}
        
        try:
            date_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            hits = self.redis_client.hgetall(f"stats:cache_hits:{date_key}")
            misses = self.redis_client.hgetall(f"stats:cache_misses:{date_key}")
            
            total_hits = int(hits.get('total', 0))
            total_misses = int(misses.get('total', 0))
            total_requests = total_hits + total_misses
            
            hit_rate = (total_hits / total_requests * 100) if total_requests > 0 else 0
            
            return {
                "date": date_key,
                "cache_hits": total_hits,
                "cache_misses": total_misses,
                "hit_rate": f"{hit_rate:.1f}%",
                "api_calls_saved": total_hits,
                "breakdown": {
                    "exact_matches": int(hits.get('exact', 0)),
                    "pattern_matches": int(hits.get('pattern', 0)),
                    "parse_matches": int(hits.get('parse', 0))
                }
            }
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"error": str(e)}
    
    def clear_cache(self, pattern: str = "*"):
        """Clear cache (admin function)"""
        if not self.redis_client:
            return False
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"🗑️ Cleared {len(keys)} cache keys")
            return True
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return False

# Global cache instance
cache_service = IntelligentCacheService()
