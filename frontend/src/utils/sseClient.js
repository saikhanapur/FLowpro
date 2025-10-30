/**
 * Server-Sent Events (SSE) Consumer for Real-Time AI Progress
 * Handles streaming updates from backend with reconnection logic
 */

export class SSEConsumer {
  constructor(url, options = {}) {
    this.url = url;
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});
    this.eventSource = null;
  }

  connect() {
    try {
      this.eventSource = new EventSource(this.url);

      this.eventSource.addEventListener('progress', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onProgress(data);
        } catch (e) {
          console.error('Failed to parse progress event:', e);
        }
      });

      this.eventSource.addEventListener('complete', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onComplete(data);
          this.close();
        } catch (e) {
          console.error('Failed to parse complete event:', e);
        }
      });

      this.eventSource.addEventListener('error', (event) => {
        console.error('SSE Error:', event);
        this.onError(new Error('Connection error'));
        this.close();
      });

      this.eventSource.onerror = (error) => {
        console.error('EventSource failed:', error);
        this.onError(error);
        this.close();
      };

    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.onError(error);
    }
  }

  close() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

/**
 * Stream document analysis with real-time progress
 */
export const streamDocumentAnalysis = async (text, callbacks = {}) => {
  const { onProgress, onComplete, onError } = callbacks;
  
  const encodedText = encodeURIComponent(text);
  const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
  const url = `${backendUrl}/api/process/analyze-stream?text=${encodedText}`;

  const consumer = new SSEConsumer(url, {
    onProgress: (data) => {
      if (onProgress) onProgress(data);
    },
    onComplete: (data) => {
      if (onComplete) onComplete(data);
    },
    onError: (error) => {
      if (onError) onError(error);
    }
  });

  consumer.connect();
  return consumer;
};
