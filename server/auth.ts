import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import MemoryStore from "memorystore";
import { firebaseAdmin } from "./firebase-admin";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express) {
  const MemStore = MemoryStore(session);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || (() => { throw new Error("SESSION_SECRET environment variable is required"); })(),
    resave: false,
    saveUninitialized: false,
    store: new MemStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByUsername(email);
        if (!user || !(await comparePasswords(password, user.password!))) {
          return done(null, false, { message: "Invalid email or password" });
        }
        if (user.isBlocked) {
          return done(null, false, { message: "This account has been blocked by an administrator" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, (user as SelectUser).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user || user.isBlocked) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Override type declarations for passport user
  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const existingUser = await storage.getUserByUsername(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          profileImageUrl: user.profileImageUrl,
          walletBalance: user.walletBalance,
          demoBalance: user.demoBalance,
          tradeMode: user.tradeMode,
        });
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    const u: any = req.user;
    
    // Asynchronous Institutional Logging: Return response immediately, log in background
    const ua = req.headers["user-agent"];
    const browser = req.headers["sec-ch-ua"];
    storage.logLogin(u.id, {
      ip: req.ip,
      device: Array.isArray(ua) ? ua[0] : ua || "unknown",
      browser: Array.isArray(browser) ? browser[0] : browser || "standard browser"
    }).catch(e => console.error("[Background logLogin error]", e));
    
    storage.logActivity(u.id, "LOGIN", "Basic email/password login")
      .catch(e => console.error("[Background logActivity error]", e));

    res.status(200).json({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      profileImageUrl: u.profileImageUrl,
      walletBalance: u.walletBalance,
      demoBalance: u.demoBalance,
      tradeMode: u.tradeMode,
      role: u.role,
      autoTradeEnabled: u.autoTradeEnabled,
      autoTradeAmount: u.autoTradeAmount,
      autoInvestProfitLimit: u.autoInvestProfitLimit,
      autoInvestLossLimit: u.autoInvestLossLimit
    });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Firebase Authentication Bridge
  app.post("/api/auth/firebase", async (req, res, next) => {
    try {
      const { idToken, firstName, lastName } = req.body;
      if (!idToken) return res.status(400).json({ message: "ID Token is required" });

      // 1. Verify token with Firebase Admin
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      // 2. Check if user exists in local DB by Firebase UID
      let user = await storage.getUserByFirebaseUid(uid);
      
      // 3. Auto-register if not exists
      if (!user) {
        // Fallback: check if exists by email to link legacy accounts
        const existingByEmail = email ? await storage.getUserByUsername(email) : null;
        if (existingByEmail) {
           await storage.updateUser(existingByEmail.id, { 
             firebaseUid: uid,
             firstName: existingByEmail.firstName || firstName || name?.split(" ")[0],
             lastName: existingByEmail.lastName || lastName || name?.split(" ").slice(1).join(" "),
             profileImageUrl: existingByEmail.profileImageUrl || picture || ""
           });
           user = await storage.getUser(existingByEmail.id);
        } else {
           user = await storage.createUser({
             email: email || `${uid}@firebase.local`,
             firstName: firstName || name?.split(" ")[0] || "User",
             lastName: lastName || name?.split(" ").slice(1).join(" ") || "",
             profileImageUrl: picture || "",
             firebaseUid: uid,
           });
           console.log(`[Firebase Auth] New user registered: ${email}`);
        }
      }

      // 4. Log in into session
      if (!user) throw new Error("Could not create local user record");
      if (user.isBlocked) return res.status(403).json({ message: "This account has been blocked by an administrator" });

      req.login(user, async (err) => {
        if (err) return next(err);

        // Log Activity
        const ua = req.headers["user-agent"];
        const browser = req.headers["sec-ch-ua"];
        await storage.logLogin(user!.id, {
          ip: req.ip,
          device: Array.isArray(ua) ? ua[0] : ua || "unknown",
          browser: Array.isArray(browser) ? browser[0] : browser || "standard browser"
        });
        await storage.logActivity(user!.id, "LOGIN", "Cloud authentication (Firebase)");

        res.json({
          id: user!.id,
          email: user!.email,
          firstName: user!.firstName,
          profileImageUrl: user!.profileImageUrl,
          walletBalance: user!.walletBalance,
          demoBalance: user!.demoBalance,
          tradeMode: user!.tradeMode,
          role: user!.role,
          autoTradeEnabled: user!.autoTradeEnabled,
          autoTradeAmount: user!.autoTradeAmount,
          autoInvestProfitLimit: user!.autoInvestProfitLimit,
          autoInvestLossLimit: user!.autoInvestLossLimit
        });
      });
    } catch (error: any) {
      console.error("[Firebase Auth] Verification failed:", error.message);
      res.status(401).json({ message: "Invalid Firebase token" });
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(200).json(null);
    const u: any = req.user;
    res.json({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      profileImageUrl: u.profileImageUrl,
      walletBalance: u.walletBalance,
      demoBalance: u.demoBalance,
      tradeMode: u.tradeMode,
    });
  });
}

// Ensure the user is authenticated, else throw 401
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    // Add claims for compatibility with previous Replit Auth assumption
    (req.user as any).claims = { sub: (req.user as any).id };
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export function registerAuthRoutes(app: Express) {
  // handled in setupAuth
}
