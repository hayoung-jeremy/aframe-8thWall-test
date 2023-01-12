import express from "express";
import fs from "fs";
import path from "path";
import https from "@small-tech/https";
import hostname from "@small-tech/cross-platform-hostname";

const PORT = 3000;
import { createServer as createViteServer } from "vite";

async function createServer() {
  const isProd = process.env.NODE_ENV === "production";
  const __dirname = path.resolve();
  const resolve = p => path.resolve(__dirname, p);

  const app = express();

  /**
   * @type {import('vite').ViteDevServer}
   */
  let vite;
  if (isProd) {
    // TODO: app.use(require('compression')());
    app.use(express.static(resolve("./dist")));
  } else {
    const cert = fs.readFileSync(".cert.pem", "utf-8");
    const key = fs.readFileSync("key.pem", "utf-8");

    vite = await createViteServer({
      logLevel: "info",
      appType: "custom",
      server: {
        middlewareMode: true,
        watch: {
          // During tests we edit the files too fast and sometimes chokidar
          // misses change events, so enforce polling for consistency
          usePolling: true,
          interval: 100,
        },
      },
      https: {
        cert,
        key,
      },
    });
    // use vite's connect instance as middleware
    app.use(vite.middlewares);
  }

  app.use("*", async (req, res) => {
    console.log(isProd);
    const template = fs.readFileSync(resolve(isProd ? "./dist/index.html" : "./index.html"), "utf-8");

    res.status(200).set({ "Content-Type": "text/html" }).end(template);
  });

  const isProduction = process.NODE_ENV === "production";

  const server = isProduction ? https.createServer({ domains: [hostname] }, app) : https.createServer(app);

  server.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`);
  });
}

createServer();
