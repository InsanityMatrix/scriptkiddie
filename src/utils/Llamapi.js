class AsyncQueue {
  constructor() {
    this.items = [];
    this.resolver = null;
    this.rejected = false;
  }

  push(item) {
    if (this.resolver) {
      this.resolver(item);
      this.resolver = null;
    } else {
      this.items.push(item);
    }
  }

  next() {
    return new Promise((resolve, reject) => {
      if (this.items.length > 0) {
        resolve(this.items.shift());
      } else if (this.rejected) {
        reject(new Error("Stream ended unexpectedly."));
      } else {
        this.resolver = resolve;
      }
    });
  }

  end() {
    this.rejected = true;
    if (this.resolver) {
      this.resolver({ done: true });
    }
  }
}

export class Llamapi {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  async prompt({ prompt, stream = false }, outputQueue) {
    const controller = new AbortController();
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        body: JSON.stringify({ prompt, stream }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      if (stream) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const decodedChunk = decoder.decode(value, { stream: true });
          buffer += decodedChunk;

          let parts = buffer.split('\ndata:');
          buffer = parts.pop(); // Retain last incomplete part

          parts.forEach(part => {
            let cleanedPart = part.replace(/^data:\s*/, '').trim();
            if (cleanedPart) {
              try {
                const jsonData = JSON.parse(cleanedPart);
                if (!jsonData.stop) {
                  outputQueue.push(jsonData.content);
                }
              } catch (err) {
                console.error(`Error parsing JSON part: ${err.message}`);
              }
            }
          });
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const jsonData = JSON.parse(buffer.replace(/^data:\s*/, '').trim());
            if (!jsonData.stop) {
              outputQueue.push(jsonData.content);
            }
          } catch (err) {
            console.error(`Error parsing final JSON part: ${err.message}`);
          }
        }
      } else {
        const result = await response.json();
        outputQueue.push(result);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      controller.abort();
      outputQueue.end();
    }
  }

  async *generateDataStream(prompt, stream) {
    const outputQueue = new AsyncQueue();
    this.prompt({ prompt, stream }, outputQueue);

    try {
      let result;
      while (!(result = await outputQueue.next()).done) {
        yield result;
      }
      yield "[[[[[STOP]]]]]";
    } catch (err) {
      console.error("Stream error:", err);
    }
  }
}
