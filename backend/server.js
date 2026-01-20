// backend/server.js

const WebSocket = require('ws');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 3000;
const METRIC_INTERVAL = 1000; // 1 second
const BURST_PROBABILITY = 0.15; // 15% chance of burst
const ERROR_PROBABILITY = 0.05; // 5% chance of error
const DISCONNECT_PROBABILITY = 0.02; // 2% chance of disconnect

// Metric types with different characteristics
const METRIC_CONFIGS = {
  cpu: {
    baseline: 45,
    variance: 25,
    spike: { probability: 0.1, magnitude: 30 },
  },
  memory: {
    baseline: 60,
    variance: 15,
    spike: { probability: 0.08, magnitude: 20 },
  },
  network: {
    baseline: 30,
    variance: 40,
    spike: { probability: 0.15, magnitude: 40 },
  },
  disk: {
    baseline: 25,
    variance: 20,
    spike: { probability: 0.05, magnitude: 25 },
  },
};

/**
 * Generate realistic metric value with variance and spikes
 */
function generateMetricValue(type) {
  const config = METRIC_CONFIGS[type];
  let value = config.baseline;

  // Add random variance
  value += (Math.random() - 0.5) * config.variance;

  // Occasional spikes
  if (Math.random() < config.spike.probability) {
    value += config.spike.magnitude * Math.random();
  }

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, value));
}

/**
 * Generate a single metric
 */
function generateMetric(type) {
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    value: Math.round(generateMetricValue(type) * 10) / 10, // 1 decimal
    timestamp: new Date().toISOString(),
    metadata: {
      source: 'mock-server',
      region: ['us-east-1', 'us-west-2', 'eu-west-1'][Math.floor(Math.random() * 3)],
    },
  };
}

/**
 * Generate error message
 */
function generateError() {
  const errors = [
    { code: 'TIMEOUT', message: 'Request timeout', severity: 'warning' },
    { code: 'RATE_LIMIT', message: 'Rate limit exceeded', severity: 'error' },
    { code: 'SERVER_ERROR', message: 'Internal server error', severity: 'error' },
    { code: 'NETWORK_ISSUE', message: 'Network connectivity issue', severity: 'warning' },
    { code: 'DATA_CORRUPTION', message: 'Data validation failed', severity: 'critical' },
  ];

  const error = errors[Math.floor(Math.random() * errors.length)];
  return {
    error: error.message,
    code: error.code,
    severity: error.severity,
    timestamp: new Date().toISOString(),
  };
}

/**
 * WebSocket Server
 */
class MetricsServer {
  constructor(port) {
    this.port = port;
    this.server = http.createServer();
    this.wss = new WebSocket.Server({ server: this.server });
    this.clients = new Map();
    this.clientIdCounter = 0;

    this.setupWebSocket();
    this.start();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = ++this.clientIdCounter;
      const clientIp = req.socket.remoteAddress;

      console.log(`[${new Date().toISOString()}] Client #${clientId} connected from ${clientIp}`);

      // Store client info
      this.clients.set(clientId, {
        ws,
        interval: null,
        connected: true,
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'connected',
        message: 'Connected to metrics stream',
        clientId,
        timestamp: new Date().toISOString(),
      });

      // Start metric stream
      this.startMetricStream(clientId);

      // Handle messages from client
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          console.log(`[${new Date().toISOString()}] Client #${clientId} message:`, data);

          // Handle different message types
          if (data.type === 'ping') {
            this.sendMessage(ws, { type: 'pong', timestamp: new Date().toISOString() });
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Invalid message from client #${clientId}:`, error);
        }
      });

      // Handle disconnect
      ws.on('close', (code, reason) => {
        console.log(`[${new Date().toISOString()}] Client #${clientId} disconnected. Code: ${code}, Reason: ${reason}`);
        this.stopMetricStream(clientId);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] Client #${clientId} error:`, error);
      });
    });

    this.wss.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] WebSocket server error:`, error);
    });
  }

  startMetricStream(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Clear existing interval if any
    if (client.interval) {
      clearInterval(client.interval);
    }

    // Start sending metrics
    client.interval = setInterval(() => {
      if (!client.connected || client.ws.readyState !== WebSocket.OPEN) {
        this.stopMetricStream(clientId);
        return;
      }

      // Simulate occasional disconnect
      if (Math.random() < DISCONNECT_PROBABILITY) {
        console.log(`[${new Date().toISOString()}] Simulating disconnect for client #${clientId}`);
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close(1001, 'Simulated network issue');
        }
        return;
      }

      // Simulate error
      if (Math.random() < ERROR_PROBABILITY) {
        const error = generateError();
        console.log(`[${new Date().toISOString()}] Sending error to client #${clientId}:`, error.code);
        this.sendMessage(client.ws, error);
        return;
      }

      // Determine if this is a burst
      const isBurst = Math.random() < BURST_PROBABILITY;
      const metricsCount = isBurst ? Math.floor(Math.random() * 8) + 3 : 1; // 3-10 metrics for burst

      if (isBurst) {
        console.log(`[${new Date().toISOString()}] Sending burst of ${metricsCount} metrics to client #${clientId}`);
      }

      // Send metrics
      const metricTypes = Object.keys(METRIC_CONFIGS);
      for (let i = 0; i < metricsCount; i++) {
        const type = metricTypes[Math.floor(Math.random() * metricTypes.length)];
        const metric = generateMetric(type);
        
        // Simulate network delay
        const delay = Math.random() * 50; // 0-50ms delay
        
        setTimeout(() => {
          if (client.ws.readyState === WebSocket.OPEN) {
            this.sendMessage(client.ws, metric);
          }
        }, delay);
      }
    }, METRIC_INTERVAL);
  }

  stopMetricStream(clientId) {
    const client = this.clients.get(clientId);
    if (client && client.interval) {
      clearInterval(client.interval);
      client.interval = null;
      client.connected = false;
    }
  }

  sendMessage(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error sending message:`, error);
      }
    }
  }

  start() {
    this.server.listen(this.port, () => {
      console.log('\n=================================================');
      console.log(`Metrics WebSocket Server running on port ${this.port}`);
      console.log(`Metric interval: ${METRIC_INTERVAL}ms`);
      console.log(`Burst probability: ${BURST_PROBABILITY * 100}%`);
      console.log(`Error probability: ${ERROR_PROBABILITY * 100}%`);
      console.log(`Disconnect probability: ${DISCONNECT_PROBABILITY * 100}%`);
      console.log('=================================================\n');
      console.log(`Connect to: ws://localhost:${this.port}\n`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\nShutting down gracefully...');
      
      // Close all client connections
      this.clients.forEach((client, clientId) => {
        this.stopMetricStream(clientId);
        client.ws.close(1000, 'Server shutdown');
      });

      // Close server
      this.wss.close(() => {
        console.log('WebSocket server closed');
        this.server.close(() => {
          console.log('HTTP server closed');
          process.exit(0);
        });
      });
    });
  }

  // Get server stats
  getStats() {
    return {
      totalConnections: this.clientIdCounter,
      activeConnections: this.clients.size,
      uptime: process.uptime(),
    };
  }
}

// Start server
const server = new MetricsServer(PORT);

// Log stats every 30 seconds
setInterval(() => {
  const stats = server.getStats();
  console.log(`[${new Date().toISOString()}] Stats:`, stats);
}, 30000);