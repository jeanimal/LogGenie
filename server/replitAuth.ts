import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Check if we should use mock authentication for Docker development
const USE_MOCK_AUTH = process.env.NODE_ENV === 'development' && process.env.MOCK_AUTH === 'true';
console.log(`[AUTH DEBUG] NODE_ENV: ${process.env.NODE_ENV}, MOCK_AUTH: ${process.env.MOCK_AUTH}, USE_MOCK_AUTH: ${USE_MOCK_AUTH}`);

if (!USE_MOCK_AUTH && !process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

// Mock authentication functions for Docker development
async function createMockUser() {
  const mockUserData = {
    id: "mock-user-docker-dev",
    email: "docker-dev@example.com",
    firstName: "Docker",
    lastName: "Developer",
    profileImageUrl: null,
  };
  
  console.log("[MOCK AUTH] Creating/updating mock user for Docker development");
  await storage.upsertUser(mockUserData);
  return mockUserData;
}

function setupMockAuth(app: Express) {
  console.log("[MOCK AUTH] Setting up mock authentication for Docker development");
  
  // Mock login endpoint
  app.get("/api/login", async (req, res) => {
    try {
      const mockUser = await createMockUser();
      
      // Use passport.authenticate for proper session handling
      req.logIn({ 
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        claims: { 
          sub: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.firstName,
          last_name: mockUser.lastName,
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      }, (err) => {
        if (err) {
          console.error("[MOCK AUTH] Error during session creation:", err);
          return res.status(500).json({ message: "Mock authentication failed" });
        }
        console.log("[MOCK AUTH] Successfully authenticated mock user");
        res.redirect("/");
      });
    } catch (error) {
      console.error("[MOCK AUTH] Error during mock login:", error);
      res.status(500).json({ message: "Mock authentication failed" });
    }
  });

  // Mock callback endpoint (for compatibility)
  app.get("/api/callback", (req, res) => {
    res.redirect("/api/login");
  });

  // Mock logout endpoint
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      console.log("[MOCK AUTH] User logged out");
      res.redirect("/");
    });
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Use mock authentication for Docker development
  if (USE_MOCK_AUTH) {
    console.log("[MOCK AUTH] Using mock authentication for Docker development");
    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));
    setupMockAuth(app);
    return;
  }

  // Use real Replit Auth for production
  console.log("[REPLIT AUTH] Using Replit authentication for production");
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // For mock authentication, just check if user is authenticated
  if (USE_MOCK_AUTH) {
    return next();
  }

  // For real Replit Auth, check token expiration and refresh if needed
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
