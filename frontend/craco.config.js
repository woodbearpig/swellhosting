// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

function makeDevServerV5Compatible(devServerConfig) {
  const {
    https,
    onAfterSetupMiddleware,
    onBeforeSetupMiddleware,
    onListening,
    setupMiddlewares,
    ...compatibleConfig
  } = devServerConfig;

  compatibleConfig.server =
    typeof https === "object"
      ? { type: "https", options: https }
      : https
        ? "https"
        : "http";
  compatibleConfig.headers = {
    ...compatibleConfig.headers,
    "Cross-Origin-Resource-Policy": "same-origin",
  };

  if (onBeforeSetupMiddleware || setupMiddlewares) {
    compatibleConfig.setupMiddlewares = (middlewares, devServer) => {
      if (onBeforeSetupMiddleware) {
        onBeforeSetupMiddleware(devServer);
      }

      return setupMiddlewares
        ? setupMiddlewares(middlewares, devServer)
        : middlewares;
    };
  }

  compatibleConfig.onListening = (devServer) => {
    devServer.close ??= (callback) => devServer.stopCallback(callback);

    if (onListening) {
      onListening(devServer);
    }
    if (onAfterSetupMiddleware) {
      onAfterSetupMiddleware(devServer);
    }
  };

  return compatibleConfig;
}

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // ---------------------------------------------------------------------
  // Social-scraper middleware.
  // Serve the current `public/index.html` DIRECTLY FROM DISK when a social
  // scraper bot (Facebook, Twitter/X, iMessage, WhatsApp, Google Messages,
  // Slack, LinkedIn, Discord, Telegram, Pinterest, etc.) requests the root.
  // Real user browsers still receive the CRA-transformed SPA (MetaManager
  // updates their tab title/favicon after hydrate). The backend rewrites
  // public/index.html after every admin save with the current OG tags, so
  // scrapers ALWAYS see the freshest share preview from a single source of
  // truth.
  //
  // We hook into `onBeforeSetupMiddleware` (v4-style) because craco's
  // makeDevServerV5Compatible wraps it into setupMiddlewares — this way
  // we're guaranteed to be invoked before webpack's own handlers.
  // ---------------------------------------------------------------------
  const fs = require("fs");
  const path2 = require("path");
  const SCRAPER_UA = /facebookexternalhit|twitterbot|slackbot|linkedinbot|discordbot|whatsapp|telegrambot|pinterest|redditbot|embedly|quora link preview|showyoubot|outbrain|iframely|skypeuripreview|nuzzel|bitrix|google[a-z\-]*bot|bingbot|duckduckbot|yandex|applebot|vkshare|w3c_validator|msnbot|semrushbot|ia_archiver|petalbot|bytespider|imess?age|googletext/i;
  const publicIndexPath = path2.resolve(__dirname, "public", "index.html");

  const originalOnBefore = devServerConfig.onBeforeSetupMiddleware;
  devServerConfig.onBeforeSetupMiddleware = (devServer) => {
    if (originalOnBefore) {
      try { originalOnBefore(devServer); } catch (_) { /* ignore */ }
    }
    // devServer.app is the underlying Express app in wds v4/v5.
    if (devServer && devServer.app && typeof devServer.app.use === "function") {
      devServer.app.use((req, res, next) => {
        try {
          const ua = req.headers["user-agent"] || "";
          const p = (req.path || req.url || "/").split("?")[0];
          const isBot = SCRAPER_UA.test(ua);
          const isRootLike = p === "/" || /^\/(about|portfolio|backdrops|services|contact|inquire|testimonials|blog|faq)\/?$/i.test(p);
          if (isBot && isRootLike && fs.existsSync(publicIndexPath)) {
            const html = fs.readFileSync(publicIndexPath, "utf8");
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("X-Rendered-By", "swell-social-scraper");
            res.end(html);
            return;
          }
        } catch (e) {
          console.warn("[swell-scraper-mw] error", e && e.message);
        }
        next();
      });
      console.log("[swell-scraper-mw] express middleware installed for social scrapers");
    }
  };

  // Add health check endpoints if enabled (preserved from original wiring).
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (originalSetupMiddlewares) middlewares = originalSetupMiddlewares(middlewares, devServer);
      setupHealthEndpoints(devServer, healthPluginInstance);
      return middlewares;
    };
  }

  return devServerConfig;
};

// Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

const configureDevServer = webpackConfig.devServer;
webpackConfig.devServer = (devServerConfig) =>
  makeDevServerV5Compatible(configureDevServer(devServerConfig));

module.exports = webpackConfig;
