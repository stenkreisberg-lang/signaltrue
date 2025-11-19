/**
 * Environment validation utility
 * Helps catch missing or misconfigured environment variables early
 */

export function validateRequiredEnvVars() {
  const required = ['MONGO_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nApplication may not function correctly.');
    console.error('See backend/.env.example for configuration details.\n');
  }
}

export function validateOAuthConfig() {
  const warnings = [];
  
  // Check Slack OAuth
  const hasSlackClientId = !!process.env.SLACK_CLIENT_ID;
  const hasSlackClientSecret = !!process.env.SLACK_CLIENT_SECRET;
  const hasSlackRedirectUri = !!process.env.SLACK_REDIRECT_URI;
  
  if (hasSlackClientId && (!hasSlackClientSecret || !hasSlackRedirectUri)) {
    warnings.push('Slack OAuth is partially configured. Need SLACK_CLIENT_SECRET and SLACK_REDIRECT_URI.');
  }
  
  // Check Google OAuth
  const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasGoogleClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  const hasGoogleRedirectUri = !!process.env.GOOGLE_REDIRECT_URI;
  
  if (hasGoogleClientId && (!hasGoogleClientSecret || !hasGoogleRedirectUri)) {
    warnings.push('Google OAuth is partially configured. Need GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.');
  }
  
  // Check Microsoft OAuth
  const hasMsClientId = !!process.env.MS_APP_CLIENT_ID;
  const hasMsClientSecret = !!process.env.MS_APP_CLIENT_SECRET;
  const hasMsRedirectUri = !!process.env.MS_APP_REDIRECT_URI;
  
  if (hasMsClientId && (!hasMsClientSecret || !hasMsRedirectUri)) {
    warnings.push('Microsoft OAuth is partially configured. Need MS_APP_CLIENT_SECRET and MS_APP_REDIRECT_URI.');
  }
  
  // Check APP_URL for OAuth callbacks
  if ((hasSlackClientId || hasGoogleClientId || hasMsClientId) && !process.env.APP_URL) {
    warnings.push('APP_URL not set. OAuth redirects will use default (http://localhost:3000).');
  }
  
  if (warnings.length > 0) {
    console.warn('\n⚠️  OAuth Configuration Warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('See VERCEL_OAUTH_SETUP.md for complete configuration guide.\n');
  }
  
  return warnings.length === 0;
}

// Helper function to determine configured AI provider
function getAiProvider() {
  if (process.env.AI_PROVIDER) {
    return process.env.AI_PROVIDER;
  }
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  return '❌ Not configured';
}

// Helper function to format configuration status
function getConfigStatus(envVar) {
  return envVar ? '✅ Configured' : '⚪ Not configured';
}

export function logEnvironmentStatus() {
  console.log('\n📋 Environment Configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PORT: ${process.env.PORT || 8080}`);
  console.log(`   MONGO_URI: ${process.env.MONGO_URI ? '✅ Set' : '❌ Not set'}`);
  console.log(`   AI Provider: ${getAiProvider()}`);
  
  console.log('\n🔗 OAuth Integrations:');
  console.log(`   Slack: ${getConfigStatus(process.env.SLACK_CLIENT_ID)}`);
  console.log(`   Google: ${getConfigStatus(process.env.GOOGLE_CLIENT_ID)}`);
  console.log(`   Microsoft: ${getConfigStatus(process.env.MS_APP_CLIENT_ID)}`);
  
  console.log('\n🔔 Optional Features:');
  console.log(`   Email: ${getConfigStatus(process.env.EMAIL_HOST)}`);
  console.log(`   Stripe: ${getConfigStatus(process.env.STRIPE_SECRET_KEY)}`);
  console.log(`   S3 Upload: ${process.env.USE_S3 === 'true' ? '✅ Enabled' : '⚪ Disabled'}`);
  console.log('');
}
