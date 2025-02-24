import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sessionConfig } from "./session";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
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

// Auth setup function
export function setupAuth(app: Express) {
  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  // Use the new session configuration
  app.use(sessionConfig);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          }
          return done(null, user);
        } catch (error) {
          console.error('[Auth] Login error:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    try {
      done(null, user.id);
    } catch (error) {
      console.error('[Auth] Serialize error:', error);
      done(error);
    }
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(new Error('User not found'));
      }
      done(null, user);
    } catch (error) {
      console.error('[Auth] Deserialize error:', error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).send("Email already registered");
      }

      const user = await storage.createUser({
        email: req.body.email,
        password: await hashPassword(req.body.password),
        name: req.body.name || '',
      });

      req.login(user, (err) => {
        if (err) {
          console.error('[Auth] Registration login error:', err);
          return next(err);
        }
        res.status(201).json(user);
      });
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('[Auth] Session creation error:', loginErr);
          return next(loginErr);
        }
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return next(err);
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('[Auth] Session destruction error:', destroyErr);
          return next(destroyErr);
        }
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(req.user);
  });

  app.patch("/api/user", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    try {
      const user = await storage.updateUser(req.user.id, {
        name: req.body.name,
      });
      res.json(user);
    } catch (error) {
      console.error('[Auth] User update error:', error);
      next(error);
    }
  });
}