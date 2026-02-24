import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

/**
 * Validate required environment variables
 */
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('\n❌ ERROR: Missing required environment variables:');
  missingEnvVars.forEach(envVar => {
    console.error(`   - ${envVar}`);
  });
  console.error('\n💡 Please copy .env.example to .env and fill in the values.\n');
  process.exit(1);
}

// Warn about weak JWT secret
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('\n⚠️  WARNING: JWT_SECRET should be at least 32 characters long for security!\n');
}

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 3000,
  
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },
  
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:4200",
  },
  
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  
  session: {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  },
};

// Log configuration (hide sensitive data)
if (config.env === 'development') {
  console.log('\n📋 Configuration loaded:');
  console.log(`   Environment: ${config.env}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   MongoDB: ${config.mongodb.uri.replace(/\/\/.*@/, '//*****@')}`);
  console.log(`   JWT Secret: ${config.jwt.secret ? '***configured***' : '❌ MISSING'}`);
  console.log(`   CORS Origin: ${config.cors.origin}`);
  console.log(`   Cloudinary: ${config.cloudinary.cloudName ? '✓ configured' : '⚠️  not configured'}\n`);
}

export default config;
