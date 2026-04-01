const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function serveFile(filePath, response) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Datei nicht gefunden.");
      return;
    }

    response.writeHead(200, { "Content-Type": contentType });
    response.end(data);
  });
}

function handleInquiry(request, response) {
  let body = "";

  request.on("data", (chunk) => {
    body += chunk.toString();

    if (body.length > 1_000_000) {
      request.destroy();
    }
  });

  request.on("end", () => {
    try {
      const payload = JSON.parse(body);
      const requiredFields = ["company", "name", "email", "service", "message"];
      const missingField = requiredFields.find((field) => !payload[field]);

      if (missingField) {
        sendJson(response, 400, { ok: false, error: `Missing field: ${missingField}` });
        return;
      }

      const entry = {
        ...payload,
        receivedAt: new Date().toISOString()
      };

      const dataDir = path.join(ROOT, "data");
      const inquiriesFile = path.join(dataDir, "inquiries.json");

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      let inquiries = [];
      if (fs.existsSync(inquiriesFile)) {
        const raw = fs.readFileSync(inquiriesFile, "utf8");
        inquiries = raw ? JSON.parse(raw) : [];
      }

      inquiries.push(entry);
      fs.writeFileSync(inquiriesFile, JSON.stringify(inquiries, null, 2));

      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendJson(response, 500, { ok: false, error: "Invalid request payload" });
    }
  });
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "POST" && url.pathname === "/api/inquiry") {
    handleInquiry(request, response);
    return;
  }

  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  serveFile(filePath, response);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
