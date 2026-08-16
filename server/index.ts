import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startBackgroundTasks } from "./background";
import { startAiBotEngine } from "./ai-bot";
import { setupWebSocket } from "./websocket";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // limit each IP to 5000 requests per windowMs to allow polling
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log(`Initializing Institutional AI Trading Engine [Fast Boot]...`);
    
    // PHASE 0: Synchronize institutional database schema
    const { runMigrations } = await import("./db");
    log("Synchronizing institutional database schema...");
    await runMigrations();

    // PHASE 1: Immediate API & Static Readiness
    await registerRoutes(httpServer, app);
    
    // Setup WebSocket server
    const wsManager = setupWebSocket(httpServer);
    httpServer.on('upgrade', (req, socket, head) => {
      if (req.url === '/ws') {
        wsManager.handleUpgrade(req, socket, head);
      }
    });
    
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // PHASE 2: Immediate Port Binding (Prevents 502/504 on Render)
    const port = parseInt(process.env.PORT || "3000", 10);
    if (!process.env.VERCEL) {
      httpServer.listen({ port, host: "0.0.0.0" }, () => {
        log(`serving on port ${port} [Ready for traffic]`);
      });
    }

    // PHASE 3: Non-blocking Background Initialization
    setTimeout(async () => {
       try {
         startBackgroundTasks();
         startAiBotEngine();

         // Auto-start Python AI engine if available
         try {
           const { spawn } = await import("child_process");
           const fs = await import("fs");
           const path = await import("path");
           const pythonPath = path.resolve(process.cwd(), "python-ai/venv/bin/python");
           const scriptPath = path.resolve(process.cwd(), "python-ai/api.py");
           if (fs.existsSync(pythonPath) && fs.existsSync(scriptPath)) {
             // Check if python AI is responding
             fetch("http://127.0.0.1:8000/docs").catch(() => {
               const child = spawn(pythonPath, [scriptPath], {
                 stdio: "ignore",
                 detached: true,
                 env: { ...process.env, PORT: "8000", PYTHON_PORT: "8000" }
               });
               child.unref();
               log("Python AI FastAPI service auto-started on port 8000.");
             });
           }
         } catch (pyErr) {
           console.error("[Python AI Launcher Error]", pyErr);
         }

         log("Institutional background engines active.");

          // PHASE 4: Market Sync - Moved to background with delay
          setTimeout(async () => {
            try {
              const { isGlobalMarketOpen } = await import("../shared/market-hours");
              const { instruments, latestPrices } = await import("../shared/schema");
              const { eq } = await import("drizzle-orm");
              const { db } = await import("./db");
              
              // Batch update for better performance
              const updates: Promise<any>[] = [];
              const allInsts = await db.select().from(instruments);
              
              for (const inst of allInsts) {
                const isOpen = isGlobalMarketOpen(inst.assetClass, inst.symbol);
                let updateData: any = { isOpen, asOf: new Date() };
                
                // Preserve real DB prices and let live background feeds update them

                updates.push(
                  db.update(latestPrices)
                    .set(updateData)
                    .where(eq(latestPrices.instrumentId, inst.id))
                );
              }
              
              await Promise.all(updates);
              log("Institutional market status & prices synchronized.");
            } catch (syncErr) {
              console.error("[Sync Error]", syncErr);
            }
          }, 2000); // Delay to not block startup
       } catch (error) {
         console.error("[Background Init Error]", error);
       }
    }, 1000); // Start background tasks after 1 second

  } catch (error: any) {
    console.error(`[Critical Error] Startup failed:`, error);
    // CRITICAL: Always return the error details for structural debugging
    app.all("/api/*path", (_req, res) => {
      res.status(500).json({ 
        message: "Initialization Failed", 
        error: error.message || String(error),
        stack: error.stack || null
      });
    });
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Detailed production logging for faster troubleshooting
    console.error(`[Fatal Error] ${status} - ${message}`);
    if (err.stack) console.error(err.stack);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ 
      message: process.env.NODE_ENV === "production" ? "Internal Server Error" : message,
      error: process.env.NODE_ENV === "production" ? undefined : err.toString()
    });
  });

  // Vercel Export Guard
  if (process.env.VERCEL) {
    log(`Exporting app for Vercel runtime`);
  }
})();

export default app;
