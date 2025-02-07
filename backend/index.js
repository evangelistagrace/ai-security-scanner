const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { exec } = require("child_process");
const ZapClient = require("zaproxy");

require("dotenv").config();

const app = express();

const zapOptions = {
  apiKey: process.env.ZAP_API_KEY, // ZAP API Key
  proxy: {
    host: "localhost",
    port: 8080,
  },
};

const zaproxy = new ZapClient(zapOptions);

app.use(cors());
app.use(express.json());


/**
 * 🕷️ Start a Spider Scan (Crawls Website)
 */
app.get("/scan/spider/:url", async (req, res) => {
  try {
    const targetUrl = decodeURIComponent(req.params.url);
    const params = {
      url: targetUrl,
    };
    console.log(`Starting Spider Scan on ${targetUrl}`);

    // Start the spider scan
    const response = await zaproxy.spider.scan(params);
    if (!response.scan) {
      throw new Error(
        "Spider scan initiation failed. Ensure the URL is correct and accessible."
      );
    }

    const scanId = response.scan;
    console.log(`Spider Scan Started with ID: ${scanId}`);

    let status = 0;

    // Poll scan status every 5 seconds
    do {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const statusResponse = await zaproxy.spider.status(scanId);
      status = parseInt(statusResponse.status, 10);
      console.log(`Spider Scan Progress: ${status}%`);
    } while (status < 100);

    console.log("Spider scan completed!");

    res.json({ message: "Spider scan completed successfully", scanId });
  } catch (error) {
    console.error("Error running Spider scan:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🔥 Start an Active Scan (Finds Security Issues)
 */
app.get("/scan/active/:url", async (req, res) => {
  const targetUrl = decodeURIComponent(req.params.url);
  const params = {
    url: targetUrl,
  };
  console.log(`Starting Active Scan on ${targetUrl}`);
  try {
    // Ensure the site has been accessed before scanning
    await zaproxy.core.accessUrl(params);

    // Start the active scan
    const response = await zaproxy.ascan.scan(params);
    if (!response.scan) {
      throw new Error(
        "Scan initiation failed. Ensure the URL is correct and accessible."
      );
    }

    console.log("Active Scan Started:", response);
    let status = 0;

    // Poll scan status every 5 seconds
    do {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      status = await zaproxy.ascan.status(response.scan);
      console.log(`Active Scan Progress: ${status}%`);
    } while (status < 100);

    console.log("Active Scan Completed!");
    res.json({ message: "Active scan completed", scanId: response.scan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📊 Get Scan Results (Alerts Found)
 */
app.get("/scan/results/:url", async (req, res) => {
  try {
    const targetUrl = decodeURIComponent(req.params.url);
    const params = {
      baseurl: targetUrl,
    };
    console.log("Fetching scan results...");

    const { alerts }  = await zaproxy.alert.alerts(params);

    // Log the raw response to debug missing fields
    // console.log(
    //   "Raw ZAP Alerts Response:",
    //   JSON.stringify(alertsResponse, null, 2)
    // );

    if (
      !alerts ||
      !Array.isArray(alerts) ||
      alerts.length === 0
    ) {
      return res.json({ message: "No vulnerabilities found.", alerts: [] });
    }

    /*

        sample response:
        {
            "sourceid": "3",
            "other": "The presence of the 'Age' header indicates that a HTTP/1.1 compliant caching server is in use.",
            "method": "GET",
            "evidence": "Age: 1",
            "pluginId": "10050",
            "cweid": "-1",
            "confidence": "Medium",
            "sourceMessageId": 2926,
            "wascid": "-1",
            "description": "The content was retrieved from a shared cache. If the response data is sensitive, personal or user-specific, this may result in sensitive information being leaked. In some cases, this may even result in a user gaining complete control of the session of another user, depending on the configuration of the caching components in use in their environment. This is primarily an issue where caching servers such as \"proxy\" caches are configured on the local network. This configuration is typically found in corporate or educational environments, for instance.",
            "messageId": "2926",
            "inputVector": "",
            "url": "https://gracefulcoder.netlify.app/static/img/19-wapp.jpg",
            "tags": {
                "WSTG-v42-ATHN-06": "https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/04-Authentication_Testing/06-Testing_for_Browser_Cache_Weaknesses"
            },
            "reference": "https://tools.ietf.org/html/rfc7234\nhttps://tools.ietf.org/html/rfc7231\nhttps://www.rfc-editor.org/rfc/rfc9110.html",
            "solution": "Validate that the response does not contain sensitive, personal or user-specific information. If it does, consider the use of the following HTTP response headers, to limit, or prevent the content being stored and retrieved from the cache by another user:\nCache-Control: no-cache, no-store, must-revalidate, private\nPragma: no-cache\nExpires: 0\nThis configuration directs both HTTP 1.0 and HTTP 1.1 compliant caching servers to not store the response, and to not retrieve the response (without validation) from the cache, in response to a similar request.",
            "alert": "Retrieved from Cache",
            "param": "",
            "attack": "",
            "name": "Retrieved from Cache",
            "risk": "Informational",
            "id": "861",
            "alertRef": "10050-2"
        },
    */

    // Safely parse scan results
    const alertsResponse = alerts.map((alert) => ({
      name: alert.name || "Unknown Vulnerability",
      risk: alert.risk || "Unknown",
      url: alert.url ? alert.url : "No URL found",
      description: alert.description
        ? alert.description
        : "No description available",
    }));

    console.log("Finished fetching scan results");
    res.json({ message: "Scan results retrieved", alertsResponse });
  } catch (error) {
    console.error("Error fetching alerts:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🔎 Match Findings with CVE Data
 */
app.get("/scan/cve-matching/:url", async (req, res) => {
//   const keyword = req.params.keyword;
  try {
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(
      keyword
    )}`;

    // set header for apiKey
    const headers = {
      "Content-Type": "application/json",
      "x-apiKey": process.env.NVD_API_KEY,
    };

    const response = await axios.get(url, { headers });
    const cveItems = response.data.vulnerabilities;

    const cveResults = cveItems.map((cve) => ({
      id: cve.cve.id,
      description: cve.cve.descriptions[0].value,
      metrics: cve.cve.metrics,
      references: cve.cve.references,
    }));

    res.json(cveResults);
  } catch (error) {
    console.log(error);
    switch (error.response.status) {
      case 401:
        return res.status(401).json({ error: "Invalid API Key" });
      case 404:
        return res.status(404).json({ error: "No CVE data found" });
      case 503:
        return res.status(503).json({ error: "Internal Server Error" });
      default:
        return res.status(500).json({ error: "Error fetching CVE data" });
    }
  }
});

// Run Nmap Scan
app.get("/scan/network/:ip", (req, res) => {
  const targetIP = req.params.ip;
  exec(`nmap -p 22,80,443 ${targetIP}`, (error, stdout) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ result: stdout });
  });
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
