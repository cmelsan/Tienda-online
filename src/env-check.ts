/**
 * Environment Variables Validation
 * This file validates that all required environment variables are present
 * In Docker/CI builds: only warns (vars injected at runtime)
 * In development: fails fast if configuration is missing
 */

const requiredEnvVars = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'BREVO_API_KEY',
  'PUBLIC_CLOUDINARY_CLOUD_NAME',
  'PUBLIC_CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const optionalEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY', // Only needed for admin operations
  'FROM_EMAIL',
  'FROM_NAME',
];

// Detect if we're in a Docker/CI build context
// In these environments, env vars are injected at runtime, not build time
const isDockerBuild = process.env.CI || 
                      process.env.DOCKER_BUILD || 
                      process.env.NIXPACKS_BUILD ||
                      typeof process.env.HOME === 'undefined';

const errors: string[] = [];
const warnings: string[] = [];

// Check required variables
requiredEnvVars.forEach(varName => {
  if (!import.meta.env[varName]) {
    errors.push(`❌ Missing required environment variable: ${varName}`);
  }
});

// Check optional variables
optionalEnvVars.forEach(varName => {
  if (!import.meta.env[varName]) {
    warnings.push(`⚠️  Optional environment variable not set: ${varName}`);
  }
});

// Report results
if (errors.length > 0) {
  if (isDockerBuild) {
    // In Docker/CI: only warn, don't fail the build
    console.warn('\n⚠️  Environment variables will be validated at runtime');
    console.warn('📋 Expected variables:', requiredEnvVars.join(', '));
    console.warn('');
  } else {
    // In development: fail fast
    console.error('\n🚨 Environment Configuration Errors:\n');
    errors.forEach(err => console.error(err));
    console.error('\nPlease check your .env file and ensure all required variables are set.\n');
    throw new Error('Missing required environment variables');
  }
}

if (warnings.length > 0 && import.meta.env.DEV) {
  console.warn('\n⚠️  Environment Configuration Warnings:\n');
  warnings.forEach(warn => console.warn(warn));
  console.warn('');
}

if (errors.length === 0 && import.meta.env.DEV) {
  console.log('✅ All required environment variables are configured\n');
}

export {};
