class MessageQueue {
  constructor() {
    this.scans = new Map();
  }

  createScan(target) {
    const scanId = Math.random().toString(36).substr(2, 9);
    this.scans.set(scanId, {
      messages: [],
      status: "running",
      target,
    });
    return scanId;
  }

  addMessage(scanId, message, type = "info") {
    const scan = this.scans.get(scanId);
    if (scan) {
      scan.messages.push({
        message,
        timestamp: new Date(),
        type,
      });
    }
  }

  getScanMessages(scanId) {
    return this.scans.get(scanId)?.messages || [];
  }

  completeScan(scanId) {
    const scan = this.scans.get(scanId);
    if (scan) {
      scan.status = "completed";
    }
  }
}

module.exports = new MessageQueue();
