const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "public", "config.js");
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseSchema = process.env.SUPABASE_SCHEMA || "portfolio_dashboard";

if (!supabaseUrl || !supabaseAnonKey) {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      `window.PORTFOLIO_CONFIG = {\n  SUPABASE_URL: "",\n  SUPABASE_ANON_KEY: "",\n  SUPABASE_SCHEMA: "${supabaseSchema}"\n};\n`
    );
  }
  console.log("Supabase env vars are not set. Keeping local config.js.");
  process.exit(0);
}

fs.writeFileSync(
  configPath,
  `window.PORTFOLIO_CONFIG = {\n  SUPABASE_URL: ${JSON.stringify(supabaseUrl)},\n  SUPABASE_ANON_KEY: ${JSON.stringify(supabaseAnonKey)},\n  SUPABASE_SCHEMA: ${JSON.stringify(supabaseSchema)}\n};\n`
);

console.log("Wrote public/config.js from environment variables.");
