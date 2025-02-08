const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { exec } = require("child_process");
const ZapClient = require("zaproxy");
// const { OpenAI } = require("langchain/llms/openai");
// const { PromptTemplate } = require("langchain/prompts");
// const { LLMChain } = require("langchain/chains");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { ChatOpenAI } = require("@langchain/openai");
const dns = require("dns").promises;


require("dotenv").config();

const app = express();

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
 * 🎯 Run Complete Security Scan Pipeline
 */
app.get("/scan/full/:url", async (req, res) => {
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
    const targetUrl = decodeURIComponent(req.params.url);

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
      url: targetUrl,
      timestamp: new Date().toISOString(),
      spiderScanId: spiderResponse.data.scanId,
      activeScanId: activeScanResponse.data.scanId,
      //   vulnerabilities: resultsResponse.data.alertsResponse || [],
      vulnerabilities: cveMatches || [],
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
app.get("/scan/spider/:url", async (req, res) => {
  try {
    const targetUrl = decodeURIComponent(req.params.url);
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
app.get("/scan/active/:url", async (req, res) => {
  const targetUrl = decodeURIComponent(req.params.url);
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
app.get("/scan/results/:url", async (req, res) => {
  try {
    const targetUrl = decodeURIComponent(req.params.url);
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
          description: alert.description,
          solution: alert.solution,
          urls: [alert.url],
        };
      } else {
        acc[alert.name].urls.push(alert.url);
      }
      return acc;
    }, {});

    // Convert map to array format
    const groupedAlerts = Object.values(alertsMap);

    const alertsResponse = groupedAlerts.map((alert) => ({
      name: alert.name || "Unknown Vulnerability",
      risk: alert.risk || "Unknown Risk",
      description: alert.description
        ? alert.description
        : "No description available",
      solution: alert.solution ? alert.solution : "No solution available",
      urls: alert.urls ? alert.urls : "No URL found",
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
          alert: {
            name: alert.name,
            risk: alert.risk,
            description: alert.description,
            solution: alert.solution,
            urls: alert.urls,
          },
          cves: [],
        };
      }
      const url = `${cveApiV2BaseUrl}?keywordSearch=${encodeURIComponent(
        alert.cveKeyword
      )}`;

      const headers = {
        "Content-Type": "application/json",
        "x-apiKey": process.env.NVD_API_KEY,
      };

      await new Promise((resolve) => setTimeout(resolve, 8000)); // Sleep for 6 second before each request
      const response = await axios.get(url, { headers });

      return {
        alert: {
          name: alert.name,
          risk: alert.risk,
          description: alert.description,
          solution: alert.solution,
          urls: alert.urls,
          cveKeyword: alert.cveKeyword || "No CVE Keyword",
        },
        cves: response.data.vulnerabilities.map((cve) => ({
          id: cve.cve.id,
          description: cve.cve.descriptions[0].value,
          metrics: cve.cve.metrics || {},
          references: cve.cve.references,
        })),
      };
    });

    const matchedResults = await Promise.all(matchPromises);

    console.log("🔥 Finished CVE Matching");

    res.json({ matches: matchedResults });
  } catch (error) {
    console.error("CVE matching error:", error.message);
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

// Run Nmap Scan
app.get("/scan/network/:ip", (req, res) => {
  const targetIP = req.params.ip;
  exec(`nmap -p 22,80,443 ${targetIP}`, (error, stdout) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ result: stdout });
  });
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
    // const prompt = ChatPromptTemplate.fromTemplate(
    //   "Tell me a {adjective} joke"
    // );
    const chain = prompt.pipe(llm);
    const response = await chain.invoke({
      vulnerabilityName: vulnerabilityName,
      vulnerabilityDescription: vulnerabilityDescription,
    });
    const keyword = response.content;
    console.log(keyword);

    // The response.text contains the raw output from the LLM.
    // Split it into keywords assuming a comma-separated output.
    // const keywords = response.text
    //   .trim()
    //   .split(",")
    //   .map((kw) => kw.trim())
    //   .filter((kw) => kw.length > 0);
    return keyword;
  } catch (error) {
    console.error("Error generating keywords:", error);
    // Fallback: return the original vulnerability name in an array
    return [vulnerabilityName];
  }
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
