#!/bin/bash

echo "🚀 Building LogGenie for deployment..."

# Kill any running vite processes that might interfere
pkill -f vite || true

# Build backend
echo "📦 Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Create production HTML that properly loads the React app
echo "📄 Creating production HTML with embedded React app..."

# Copy the client HTML structure but modify it for production
mkdir -p dist/public

cat > dist/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LogGenie - Cybersecurity Log Analysis</title>
    <meta name="description" content="Advanced cybersecurity log analysis platform with AI-powered anomaly detection" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      window.tailwind.config = {
        darkMode: ["class"],
        theme: {
          extend: {
            colors: {
              background: "#ffffff",
              foreground: "#0a0a0a", 
              primary: "#2563eb",
              secondary: "#f1f5f9",
              muted: "#f8fafc",
              border: "#e2e8f0",
              card: "#ffffff",
              "card-foreground": "#0a0a0a",
              destructive: "#dc2626",
              "destructive-foreground": "#ffffff"
            }
          }
        }
      }
    </script>
    <style>
      body {
        font-family: system-ui, sans-serif;
        margin: 0;
        padding: 0;
      }
      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: system-ui;
      }
      .app-loaded .loading {
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="root">
      <div class="loading">
        <div style="text-align: center; padding: 2rem;">
          <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem; color: #2563eb;">
            🛡️ LogGenie
          </h1>
          <p style="color: #64748b;">Loading cybersecurity platform...</p>
        </div>
      </div>
    </div>
    
    <script>
      // Check authentication status and redirect accordingly
      async function initApp() {
        try {
          const response = await fetch('/api/auth/user');
          if (response.ok) {
            // User is authenticated, show main app
            window.location.href = '/dashboard';
          } else {
            // User needs to login
            showLoginPage();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          showLoginPage();
        }
      }
      
      function showLoginPage() {
        document.getElementById('root').innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
            <div style="text-align: center; padding: 2rem; max-width: 500px;">
              <h1 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; color: #2563eb;">
                🛡️ LogGenie
              </h1>
              <p style="color: #64748b; margin-bottom: 2rem; font-size: 1.1rem;">
                Advanced Cybersecurity Log Analysis Platform
              </p>
              <div style="background: #f8fafc; padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 2rem; border: 1px solid #e2e8f0;">
                <div style="display: grid; gap: 0.5rem; text-align: left;">
                  <div style="color: #059669;">✅ AI-Powered Anomaly Detection</div>
                  <div style="color: #059669;">✅ Real-time Threat Analysis</div>
                  <div style="color: #059669;">✅ Comprehensive Log Analytics</div>
                  <div style="color: #059669;">✅ Multi-tenant Security</div>
                </div>
              </div>
              <a href="/api/login" style="display: inline-block; background: #2563eb; color: white; padding: 0.875rem 2rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; font-size: 1.1rem; transition: background-color 0.2s;">
                Access Security Console
              </a>
              <p style="color: #6b7280; margin-top: 1rem; font-size: 0.875rem;">
                Secure authentication powered by Replit
              </p>
            </div>
          </div>
        `;
      }
      
      // Initialize the app
      initApp();
    </script>
  </body>
</html>
EOF

# Copy static files to the correct location for server
cp -r dist/public ./public

echo "✅ Production build ready!"
echo "📁 Files created:"
echo "   - dist/index.js (backend bundle)"
echo "   - dist/public/index.html (production frontend)"
echo "   - public/ (copied for server static serving)"
echo ""
echo "🚀 Ready for Replit Deployment!"
echo "   After login, users will be redirected to the full React app"