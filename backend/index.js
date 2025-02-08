const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { exec, spawn } = require("child_process");
const ZapClient = require("zaproxy");
// const { OpenAI } = require("langchain/llms/openai");
// const { PromptTemplate } = require("langchain/prompts");
// const { LLMChain } = require("langchain/chains");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { ChatOpenAI } = require("@langchain/openai");
const dns = require("dns").promises;
const net = require("net");

require("dotenv").config();

const app = express();
const ZAP_API = "http://localhost:8080/JSON"; // Change if your ZAP runs on a different port

app.use(cors());
app.use(express.json());

// Instantiate ZAP proxy and client
const zapOptions = {
  apiKey: process.env.ZAP_API_KEY, // ZAP API Key
  proxy: {
    host: "localhost",
    port: 8080,
  },
};

const zaproxy = new ZapClient(zapOptions);

// Instantiate LLM
const llm = new ChatOpenAI({
  model: "gpt-3.5-turbo",
  temperature: 0,
});

/**
 * 🚀 Start a Full Scan - Web and Network
 *
 */
app.get("/scan/full/:target", async (req, res) => {
  const scanStatus = {
    currentStage: "initializing",
    stages: {
      spider: "pending",
      active: "pending",
      results: "pending",
      cve: "pending",
      network: "pending",
    },
  };

  try {
    const targetUrl = decodeURIComponent(req.params.target);

    // Spider Scan
    scanStatus.currentStage = "spider";
    const spiderResponse = await axios.get(
      `http://localhost:${PORT}/scan/spider/${encodeURIComponent(targetUrl)}`
    );
    scanStatus.stages.spider = "completed";

    // Active Scan
    scanStatus.currentStage = "active";
    const activeScanResponse = await axios.get(
      `http://localhost:${PORT}/scan/active/${encodeURIComponent(targetUrl)}`
    );
    scanStatus.stages.active = "completed";

    // Get Results
    scanStatus.currentStage = "results";
    const resultsResponse = await axios.get(
      `http://localhost:${PORT}/scan/results/${encodeURIComponent(targetUrl)}`
    );
    scanStatus.stages.results = "completed";

    // Match CVEs if vulnerabilities found
    scanStatus.currentStage = "cve";
    let cveMatches = [];
    if (
      resultsResponse.data.alertsResponse &&
      resultsResponse.data.alertsResponse.length > 0
    ) {
      const cveResponse = await axios.post(
        `http://localhost:${PORT}/scan/cve`,
        { alertsResponse: resultsResponse.data.alertsResponse }
      );
      cveMatches = cveResponse.data.matches;
    }
    scanStatus.stages.cve = "completed";

    // Network Scan
    scanStatus.currentStage = "network";
    const networkScanResponse = await axios.get(
      `http://localhost:${PORT}/scan/network/${encodeURIComponent(targetUrl)}`
    );
    scanStatus.stages.network = "completed";

    // Return combined results
    res.json({
      status: scanStatus,
      target: targetUrl,
      timestamp: new Date().toISOString(),
      results: {
        webscan: {
          spiderScanId: spiderResponse.data.scanId,
          activeScanId: activeScanResponse.data.scanId,
          vulnerabilities: cveMatches || [],
        },
        networkscan: networkScanResponse.data,
      },
    });
  } catch (error) {
    console.error(
      `Error during ${scanStatus.currentStage} scan:`,
      error.message
    );
    scanStatus.stages[scanStatus.currentStage] = "failed";
    res.status(500).json({
      error: `Failed during ${scanStatus.currentStage} scan: ${error.message}`,
      status: scanStatus,
    });
  }
});

/**
 * 🎯 Run Complete Web Scan
 */
app.get("/scan/web/:target", async (req, res) => {
  const scanStatus = {
    currentStage: "initializing",
    stages: {
      spider: "pending",
      active: "pending",
      results: "pending",
      cve: "pending",
    },
  };

  try {
    const targetUrl = decodeURIComponent(req.params.target);

    // Spider Scan
    scanStatus.currentStage = "spider";
    const spiderResponse = await axios.get(
      `http://localhost:${PORT}/scan/spider/${encodeURIComponent(targetUrl)}`
    );
    scanStatus.stages.spider = "completed";

    // Active Scan
    scanStatus.currentStage = "active";
    const activeScanResponse = await axios.get(
      `http://localhost:${PORT}/scan/active/${encodeURIComponent(targetUrl)}`
    );
    scanStatus.stages.active = "completed";

    // Get Results
    scanStatus.currentStage = "results";
    const resultsResponse = await axios.get(
      `http://localhost:${PORT}/scan/results/${encodeURIComponent(targetUrl)}`
    );
    scanStatus.stages.results = "completed";

    // Match CVEs if vulnerabilities found
    scanStatus.currentStage = "cve";
    let cveMatches = [];
    if (
      resultsResponse.data.alertsResponse &&
      resultsResponse.data.alertsResponse.length > 0
    ) {
      const cveResponse = await axios.post(
        `http://localhost:${PORT}/scan/cve`,
        { alertsResponse: resultsResponse.data.alertsResponse }
      );
      cveMatches = cveResponse.data.matches;
    }
    scanStatus.stages.cve = "completed";

    // Return combined results
    res.json({
      status: scanStatus,
      target: targetUrl,
      timestamp: new Date().toISOString(),
      results: {
        webscan: {
          spiderScanId: spiderResponse.data.scanId,
          activeScanId: activeScanResponse.data.scanId,
          vulnerabilities: cveMatches || [],
        },
      },
      //   vulnerabilities: resultsResponse.data.alertsResponse || [],
    });
  } catch (error) {
    console.error(
      `Error during ${scanStatus.currentStage} scan:`,
      error.message
    );
    scanStatus.stages[scanStatus.currentStage] = "failed";
    res.status(500).json({
      error: `Failed during ${scanStatus.currentStage} scan: ${error.message}`,
      status: scanStatus,
    });
  }
});

/**
 * 🕷️ Start a Spider Scan (Crawls Website)
 */
app.get("/scan/spider/:target", async (req, res) => {
  try {
    const targetUrl = decodeURIComponent(req.params.target);
    const params = {
      url: targetUrl,
    };
    console.log(`🚀 Starting Spider Scan on ${targetUrl}`);

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

    console.log("🔥 Spider scan completed!");

    res.json({ message: "Spider scan completed successfully", scanId });
  } catch (error) {
    console.error("Error running Spider scan:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🔥 Start an Active Scan (Finds Security Issues)
 */
app.get("/scan/active/:target", async (req, res) => {
  const targetUrl = decodeURIComponent(req.params.target);
  const params = {
    url: targetUrl,
  };
  console.log(`🚀 Starting Active Scan on ${targetUrl}`);
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

    // console.log("Active Scan Started:", response);
    let status = 0;

    // Poll scan status every 5 seconds
    do {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      status = await zaproxy.ascan.status(response.scan);
      console.log(`Active Scan Progress: ${status}%`);
    } while (status < 100);

    console.log("🔥 Active Scan Completed!");
    res.json({ message: "Active scan completed", scanId: response.scan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📊 Get Scan Results (Alerts Found)
 */
app.get("/scan/results/:target", async (req, res) => {
  try {
    const targetUrl = decodeURIComponent(req.params.target);
    const params = {
      baseurl: targetUrl,
    };
    console.log(`🚀 Fetching Scan Results For ${targetUrl}`);

    let { alerts } = await zaproxy.alert.alerts(params);

    // Log the raw response to debug missing fields
    // console.log(
    //   "Raw ZAP Alerts Response:",
    //   JSON.stringify(alertsResponse, null, 2)
    // );

    if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
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
    // group alerts by name and then combine the urls
    const alertsMap = alerts.reduce((acc, alert) => {
      if (!acc[alert.name]) {
        acc[alert.name] = {
          name: alert.name,
          risk: alert.risk,
          confidence: alert.confidence,
          description: alert.description,
          solution: alert.solution,
          count: 1,
          // urls: [alert.url],
        };
      } else {
        acc[alert.name].count += 1;
        // acc[alert.name].urls.push(alert.url);
      }
      return acc;
    }, {});

    // Convert map to array format
    const groupedAlerts = Object.values(alertsMap);

    const alertsResponse = groupedAlerts.map((alert) => ({
      name: alert.name || "Unknown Vulnerability",
      risk: alert.risk || "Unknown Risk",
      confidence: alert.confidence || "Unknown Confidence",
      description: alert.description
        ? alert.description
        : "No description available",
      solution: alert.solution ? alert.solution : "No solution available",
      count: alert.count,
      // urls: alert.urls ? alert.urls : "No URL found",
    }));

    // run the alerts through the LLM to generate keywords for CVE lookup
    await Promise.all(
      alertsResponse
        .filter(
          (alert) =>
            alert.name !== "Unknown Vulnerability" &&
            alert.risk !== "Informational" &&
            alert.risk !== "Unknown Risk"
        )
        .map(async (alert) => {
          const keyword = await generateCveKeywords({
            vulnerabilityName: alert.name,
            vulnerabilityDescription: alert.description
              ? alert.description
              : "No description available",
          });
          alert.cveKeyword = keyword;
          return alert;
        })
    );

    // Sort after promises are resolved
    alertsResponse.sort((a, b) => {
      const riskLevels = ["Informational", "Low", "Medium", "High"];
      return riskLevels.indexOf(b.risk) - riskLevels.indexOf(a.risk);
    });

    console.log("🔥 Finished Fetching Scan Results");
    res.json({ message: "Scan results retrieved", alertsResponse });
  } catch (error) {
    console.error("Error fetching alerts:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📝 Bulk CVE Matching for Filtered Alerts
 */
app.post("/scan/cve", async (req, res) => {
  try {
    // console.log(req.body)
    const alerts = req.body.alertsResponse;
    const cveApiV2BaseUrl = "https://services.nvd.nist.gov/rest/json/cves/2.0";
    console.log("🚀 Starting CVE Matching");
    // Process alerts concurrently
    const matchPromises = alerts.map(async (alert) => {
      if (!alert.cveKeyword) {
        return {
          ...alert,
          cveIds: [],
        };
      }
      console.log("Keyword: ", alert.cveKeyword);
      const url = `${cveApiV2BaseUrl}?keywordSearch=${encodeURIComponent(
        alert.cveKeyword
      )}`;

      const config = {
        headers: {
          "Content-Type": "application/json",
          "x-apiKey": process.env.NVD_API_KEY
        }
      };

      // const headers = {
      //   "Content-Type": "application/json",
      //   "x-apiKey": process.env.NVD_API_KEY,
      // };

      // const axiosConfig = {
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Connection": "close", // Ensures Axios does not reuse old TCP connections
      //     "x-apiKey": process.env.NVD_API_KEY,
      //   },
      // };

      await new Promise((resolve) => setTimeout(resolve, 20000)); // Sleep for 6 second before each request
      const response = await axios.get(url, config);

      return {
        ...alert,
        cveKeyword: alert.cveKeyword || "No CVE Keyword",
        cveIds: response.data.vulnerabilities.map((cve) => cve.cve.id),
      };
    });

    const matchedResults = await Promise.all(matchPromises);

    console.log("🔥 Finished CVE Matching");

    res.json({ matches: matchedResults });
  } catch (error) {
    console.error("CVE matching error:", error.message);
    console.log('full error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🔎 Search CVE by Keyword
 */
app.get("/scan/cve/:keyword", async (req, res) => {
  try {
    const keyword = req.params.keyword;
    const cveApiV2BaseUrl = "https://services.nvd.nist.gov/rest/json/cves/2.0";
    const url = `${cveApiV2BaseUrl}?keywordSearch=${encodeURIComponent(
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

app.get(
  "/generate-cve-keyword/:vulnerabilityName/:vulnerabilityDescription",
  async (req, res) => {
    const vulnerabilityName = req.params.vulnerabilityName;
    const vulnerabilityDescription = req.params.vulnerabilityDescription;
    const vulnerability = {
      vulnerabilityName,
      vulnerabilityDescription,
    };
    console.log("Generating CVE keyword for:", vulnerability);
    const keyword = await generateCveKeywords(vulnerability);
    res.json({ keyword });
  }
);

async function generateCveKeywords({
  vulnerabilityName,
  vulnerabilityDescription,
}) {
  try {
    const prompt = ChatPromptTemplate.fromTemplate(
      "Given the vulnerability name: {vulnerabilityName} and vulnerability description: {vulnerabilityDescription}, extract a concise keyword for CVE lookup that specifically identifies the header in question. Remove any negations or extraneous words (e.g., 'Missing', 'Not Set'). For example: - For 'Missing Anti-clickjacking Header', return 'Anti-clickjacking Header'. - For 'Content Security Policy (CSP) Header Not Set', return 'Content Security Policy (CSP) Header'. - For 'Strict-Transport-Security Header Not Set', return 'Strict-Transport-Security Header'. Return only the keyword without additional commentary."
    );
    const chain = prompt.pipe(llm);
    const response = await chain.invoke({
      vulnerabilityName: vulnerabilityName,
      vulnerabilityDescription: vulnerabilityDescription,
    });
    const keyword = response.content;
    console.log(keyword);
    return keyword;
  } catch (error) {
    console.error("Error generating keywords:", error);
    // Fallback: return the original vulnerability name in an array
    return [vulnerabilityName];
  }
}

// Helper: Validate IPv4 address (each octet 0-255)
function isIPv4Address(ip) {
  const ipv4Regex = /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  return ipv4Regex.test(ip);
}

// Helper: Validate IPv6 address, including shorthand notation (e.g., "::")
function isIPv6Address(ip) {
  const ipv6Regex = /^((?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,7}:|(?:[0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,5}(?::[0-9A-Fa-f]{1,4}){1,2}|(?:[0-9A-Fa-f]{1,4}:){1,4}(?::[0-9A-Fa-f]{1,4}){1,3}|(?:[0-9A-Fa-f]{1,4}:){1,3}(?::[0-9A-Fa-f]{1,4}){1,4}|(?:[0-9A-Fa-f]{1,4}:){1,2}(?::[0-9A-Fa-f]{1,4}){1,5}|[0-9A-Fa-f]{1,4}:(?:(?::[0-9A-Fa-f]{1,4}){1,6})|:(?:(?::[0-9A-Fa-f]{1,4}){1,7}|:))$/;
  return ipv6Regex.test(ip);
}

/**
 * 🎯 Run Complete Network Scan
 */
app.get("/scan/network/:target", async (req, res) => {
  try {
    let target = decodeURIComponent(req.params.target);

    // Use our helper functions to test for IPv4 and IPv6
    let isIPv4 = isIPv4Address(target);
    let isIPv6 = isIPv6Address(target);

    // If the target isn’t a valid IP, try resolving it (which may return an IP)
    if (!isIPv4 && !isIPv6) {
      // console.log(`Resolving IP for ${target}...`);
      target = await resolveIP(target);
      // Recheck the type after resolution
      isIPv4 = isIPv4Address(target);
      isIPv6 = isIPv6Address(target);
    }

    console.log(`🔍 Starting network scan for: ${target}`);
    console.log("Final IPv4 detection:", isIPv4);
    console.log("Final IPv6 detection:", isIPv6);

    // Format IPv6 addresses correctly with brackets
    const formattedTarget = target;
    const nmapArgs = isIPv6 ? ["-6", "-p", "1-1024", formattedTarget] : ["-p", "1-1024", formattedTarget];

    // Run Nmap scan using spawn() to stream output without truncation
    const nmapProcess = spawn("nmap", nmapArgs);
    let output = "";

    nmapProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    nmapProcess.stderr.on("data", (data) => {
      console.error("Nmap Error:", data.toString());
    });

    nmapProcess.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: `Nmap scan failed with exit code ${code}` });
      }
      console.log(`🔍 Completed network scan for ${target}`);
      const nmapResult = parseNmapOutput(output);
      res.json(nmapResult);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔹 Helper function: Resolve domain to IP (supports both IPv4 and IPv6)
async function resolveIP(url) {
  try {
    const hostname = new URL(url).hostname;
    const [ipv4, ipv6] = await Promise.all([
      dns.resolve4(hostname).catch(() => []),
      dns.resolve6(hostname).catch(() => []),
    ]);
    if (!ipv4.length && !ipv6.length) {
      throw new Error("No IP addresses found");
    }
    return ipv6.length ? ipv6[0] : ipv4[0]; // Prioritize IPv6 if available
  } catch (error) {
    throw new Error(`Failed to resolve IP: ${error.message}`);
  }
}

// 🔹 Helper function: Parse Nmap output
function parseNmapOutput(nmapResult) {
  const lines = nmapResult.split("\n");

  // Extract host IP
  const hostMatch = lines.find((line) => line.includes("Nmap scan report for"));
  const host = hostMatch
    ? hostMatch.split("(")[1]?.split(")")[0].trim()
    : "Unknown";

  // Extract open ports
  const ports = lines
    .filter((line) => /^\d+\/tcp\s+\w+\s+\w+/.test(line))
    .map((line) => {
      const [portInfo, state, service] = line.trim().split(/\s+/);
      return {
        port: parseInt(portInfo.split("/")[0], 10),
        state: state.toLowerCase(),
        service: service.toUpperCase(),
      };
    });

  return { host, ports };
}

// Start Server
const PORT = 3000;
app.listen(PORT, async () => {
  // instantiate ZAP Client
  // Check if ZAP is already running on port 8080
  exec("lsof -i :8080", (err, stdout) => {
    if (stdout) {
      console.log("ZAP Proxy is already running on port 8080");
    } else {
      exec(
        "/Applications/ZAP.app/Contents/Java/zap.sh -daemon -port 8080",
        (error, stdout) => {
          if (error) {
            console.error("Error starting ZAP Proxy:", error.message);
          } else {
            console.log("ZAP Proxy started successfully");
          }
        }
      );
    }
  });

  console.log(`Server running on port ${PORT}`);
});
