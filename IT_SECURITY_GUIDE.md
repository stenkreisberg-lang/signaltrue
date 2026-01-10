# 🔐 SignalTrue IT Security & Compliance Guide

**For IT Managers, Security Teams, and InfoSec Officers**

Last Updated: January 10, 2026

---

## 🎯 **EXECUTIVE SUMMARY**

SignalTrue processes sensitive behavioral data from Slack, Google Workspace, and Microsoft 365. This document outlines:
- Current security posture
- Critical vulnerabilities to address
- Compliance requirements (GDPR, SOC 2, HIPAA-adjacent)
- Recommended security enhancements
- Incident response procedures

**Current Security Rating**: ⚠️ **MODERATE** (Requires hardening for enterprise deployment)

---

## 📊 **CURRENT SECURITY POSTURE**

### ✅ **Strengths (Already Implemented)**

1. **Authentication & Authorization**:
   - JWT-based authentication (`backend/middleware/auth.js`)
   - Role-based access control (RBAC): `master_admin`, `admin`, `hr_admin`, `user`
   - Token expiration (configurable in JWT_SECRET)
   - Protected routes with `authenticateToken`, `requireAdmin`, `requireHROrAdmin`

2. **Data Encryption**:
   - TLS/HTTPS in production (enforced by Vercel/Render)
   - AES-256-GCM encryption for OAuth tokens (`backend/utils/encryption.js`)
   - Encrypted Slack/Google/Microsoft tokens at rest in MongoDB

3. **Database Security**:
   - MongoDB connection over TLS (Atlas enforces this)
   - Mongoose schema validation
   - Input sanitization via Express validators

4. **API Security**:
   - CORS whitelist for production (`signaltrue.ai`, `www.signaltrue.ai`)
   - Rate limiting on OAuth endpoints
   - Stripe webhook signature verification

5. **Privacy by Design**:
   - Team-level aggregation (no individual dashboards by default)
   - Consent audit trail (`backend/models/consentAudit.js`)
   - Privacy middleware (`backend/middleware/consentAudit.js`)
   - GDPR-compliant data retention policies

---

## 🚨 **CRITICAL VULNERABILITIES (Must Fix Before Production)**

### 🔴 **HIGH SEVERITY**

#### 1. **No Rate Limiting on API Endpoints**
**Risk**: DDoS attacks, credential stuffing, API abuse

**Current State**: Only Stripe webhook has rate limiting

**Fix Required**:
```javascript
// Install: npm install express-rate-limit
import rateLimit from 'express-rate-limit';

// Apply to all routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

app.use('/api/', apiLimiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

**Priority**: IMMEDIATE

---

#### 2. **No Input Validation/Sanitization**
**Risk**: SQL injection, NoSQL injection, XSS attacks

**Current State**: Relies on Mongoose validation only

**Fix Required**:
```javascript
// Install: npm install express-validator
import { body, param, query, validationResult } from 'express-validator';

// Example: Validate login request
app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // ... proceed with login
});

// Install: npm install mongo-sanitize
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize()); // Prevents NoSQL injection
```

**Priority**: IMMEDIATE

---

#### 3. **Sensitive Data in Logs**
**Risk**: Credentials, PII exposed in application logs

**Current State**: Console.log statements may leak sensitive data

**Fix Required**:
```javascript
// backend/utils/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'signaltrue-backend' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Redact sensitive fields
const redactSensitive = winston.format((info) => {
  if (info.password) info.password = '[REDACTED]';
  if (info.token) info.token = '[REDACTED]';
  if (info.email) info.email = info.email.replace(/(.{2}).*@/, '$1***@');
  return info;
});

logger.format = winston.format.combine(
  redactSensitive(),
  winston.format.json()
);

export default logger;

// Replace all console.log with:
import logger from './utils/logger.js';
logger.info('User logged in', { userId: user._id });
logger.error('Database error', { error: err.message }); // NOT err.stack
```

**Priority**: IMMEDIATE

---

#### 4. **No CSRF Protection**
**Risk**: Cross-Site Request Forgery attacks

**Current State**: No CSRF tokens

**Fix Required**:
```javascript
// Install: npm install csurf
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

app.use(cookieParser());
const csrfProtection = csrf({ cookie: true });

// Apply to state-changing routes
app.post('/api/*', csrfProtection, (req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken());
  next();
});

// Frontend must send CSRF token in headers:
// X-XSRF-TOKEN: <token from cookie>
```

**Priority**: HIGH (before public launch)

---

#### 5. **Weak Password Policy**
**Risk**: Brute-force attacks, weak user passwords

**Current State**: No password complexity requirements

**Fix Required**:
```javascript
// backend/models/user.js
import bcrypt from 'bcrypt';

// Add password validation
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Enforce password policy
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-zA-Z\d@$!%*?&]{12,}$/;
  if (!passwordRegex.test(this.password)) {
    throw new Error('Password must be 12+ characters with uppercase, lowercase, number, and special character');
  }
  
  // Hash with salt rounds 12 (OWASP recommendation)
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Add account lockout after 5 failed attempts
userSchema.add({
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date }
});

userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incrementLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { failedLoginAttempts: 1 } };
  
  if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};
```

**Priority**: HIGH

---

### 🟡 **MEDIUM SEVERITY**

#### 6. **No Security Headers**
**Risk**: Clickjacking, MIME sniffing, XSS

**Fix Required**:
```javascript
// Install: npm install helmet
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.signaltrue.ai"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

**Priority**: MEDIUM (before SOC 2 audit)

---

#### 7. **No Audit Logging**
**Risk**: Cannot investigate security incidents

**Fix Required**:
```javascript
// backend/models/auditLog.js
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true }, // 'LOGIN', 'DATA_ACCESS', 'DATA_EXPORT', 'CONFIG_CHANGE'
  resource: { type: String }, // 'Team:123', 'User:456'
  ipAddress: { type: String },
  userAgent: { type: String },
  status: { type: String, enum: ['SUCCESS', 'FAILURE'] },
  details: { type: Object },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// Retention: 2 years for compliance
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

export default mongoose.model('AuditLog', auditLogSchema);

// Usage in routes:
import AuditLog from '../models/auditLog.js';

router.get('/api/teams/:teamId', authenticateToken, async (req, res) => {
  await AuditLog.create({
    userId: req.user._id,
    action: 'DATA_ACCESS',
    resource: `Team:${req.params.teamId}`,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    status: 'SUCCESS'
  });
  
  // ... proceed with request
});
```

**Priority**: MEDIUM (required for SOC 2)

---

#### 8. **No API Key Rotation Policy**
**Risk**: Compromised API keys remain valid indefinitely

**Fix Required**:
```javascript
// backend/models/apiKey.js - Add rotation fields
apiKeySchema.add({
  expiresAt: { type: Date, required: true },
  rotationSchedule: { type: Number, default: 90 }, // days
  lastRotated: { type: Date, default: Date.now }
});

// Cron job to notify before expiration
cron.schedule('0 0 * * *', async () => {
  const expiringKeys = await ApiKey.find({
    expiresAt: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days
    revoked: false
  }).populate('userId', 'email');
  
  for (const key of expiringKeys) {
    // Send email notification to user
    await sendEmail(key.userId.email, 'API Key Expiring Soon', 
      `Your API key expires in 7 days. Please rotate it.`);
  }
});
```

**Priority**: MEDIUM

---

#### 9. **No Secrets Management**
**Risk**: Hardcoded secrets in code, .env files committed to Git

**Fix Required**:
```bash
# Use environment-based secrets management

# Development: .env (already using this)
# Staging: Render/Vercel environment variables
# Production: Use HashiCorp Vault or AWS Secrets Manager

# Install: npm install @aws-sdk/client-secrets-manager
# backend/utils/secrets.js
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

export async function getSecret(secretName) {
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );
    return JSON.parse(response.SecretString);
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw error;
  }
}

// Usage:
// const secrets = await getSecret('signaltrue/production');
// const MONGO_URI = secrets.MONGO_URI;
```

**Priority**: MEDIUM (before enterprise sales)

---

### 🟢 **LOW SEVERITY (Best Practices)**

#### 10. **Enable Database Encryption at Rest**
**MongoDB Atlas**: Enable encryption at rest in Atlas settings (free on M10+ clusters)

#### 11. **Implement IP Whitelisting for Admin Routes**
**Fix**:
```javascript
const adminIpWhitelist = process.env.ADMIN_IP_WHITELIST.split(',');

function checkAdminIp(req, res, next) {
  if (!adminIpWhitelist.includes(req.ip)) {
    return res.status(403).json({ message: 'Access denied from this IP' });
  }
  next();
}

app.use('/api/admin/*', checkAdminIp, authenticateToken, requireAdmin);
```

#### 12. **Add Honeypot Endpoints**
**Purpose**: Detect and ban malicious bots
```javascript
app.get('/api/admin/users/all', (req, res) => {
  // Honeypot - log attacker IP and ban
  logger.warn('Honeypot triggered', { ip: req.ip });
  // Add IP to blacklist
  res.status(404).json({ message: 'Not found' });
});
```

---

## 🏢 **COMPLIANCE REQUIREMENTS**

### **GDPR (General Data Protection Regulation)**

✅ **Already Compliant**:
- Consent tracking (`backend/models/consentAudit.js`)
- Right to access (can be built via export endpoints)
- Data minimization (team-level aggregation)
- Privacy by design

❌ **Missing**:
- **Right to be forgotten (GDPR Article 17)**:
  ```javascript
  // backend/routes/gdpr.js
  router.delete('/api/gdpr/delete-user/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    
    // Delete user data from all collections
    await User.deleteOne({ _id: userId });
    await AttritionRisk.deleteMany({ userId });
    await MetricsDaily.deleteMany({ userId });
    // ... delete from all collections
    
    await AuditLog.create({
      userId: req.user._id,
      action: 'GDPR_DELETE',
      resource: `User:${userId}`,
      status: 'SUCCESS'
    });
    
    res.json({ message: 'User data deleted per GDPR Article 17' });
  });
  ```

- **Data Processing Agreement (DPA)**: Legal document needed for customer contracts

- **Data Protection Impact Assessment (DPIA)**: Required for high-risk processing

**Priority**: HIGH (before EU customers)

---

### **SOC 2 Type II Compliance**

**Required Controls**:

1. ✅ Access Controls (RBAC implemented)
2. ❌ Audit Logging (build per #7 above)
3. ❌ Change Management (track config changes)
4. ❌ Incident Response Plan (see below)
5. ❌ Vendor Risk Management (assess Slack/Google/Microsoft)
6. ❌ Business Continuity/Disaster Recovery (backup procedures)
7. ❌ Encryption (in transit ✅, at rest needs verification)

**Audit Timeline**: 6-12 months for SOC 2 Type II certification

**Cost**: $15,000 - $50,000 for initial audit

**Priority**: HIGH (before enterprise sales)

---

### **HIPAA (If Processing Health Data)**

**Current Status**: ❌ **NOT HIPAA COMPLIANT**

**If handling health-related behavioral data** (e.g., mental health signals):

**Required**:
1. Business Associate Agreement (BAA) with customers
2. Encrypted backups
3. Access logs for all PHI
4. Employee HIPAA training
5. Breach notification procedures

**Recommendation**: **Avoid health data** unless willing to invest in HIPAA compliance ($100k+ annually)

---

## 🚨 **INCIDENT RESPONSE PLAN**

### **Security Incident Classification**

| Severity | Examples | Response Time |
|----------|----------|---------------|
| **P0 - Critical** | Data breach, ransomware, OAuth token leak | Immediate (< 1hr) |
| **P1 - High** | Unauthorized admin access, DDoS attack | 4 hours |
| **P2 - Medium** | Failed login spike, API abuse | 24 hours |
| **P3 - Low** | Minor config error, non-critical bug | 1 week |

---

### **Breach Response Procedures**

#### **Step 1: Containment (< 1 hour)**
```bash
# Immediately revoke all OAuth tokens
node backend/scripts/revoke-all-tokens.js

# Rotate database credentials
# Rotate JWT secret (forces all users to re-login)
# Block malicious IPs in firewall

# Enable maintenance mode
export MAINTENANCE_MODE=1
```

#### **Step 2: Investigation (< 4 hours)**
- Review audit logs (`backend/models/auditLog.js`)
- Check database access logs (MongoDB Atlas logs)
- Analyze application logs for suspicious patterns
- Identify scope: What data was accessed? How many users affected?

#### **Step 3: Notification (< 72 hours for GDPR)**
```javascript
// backend/services/breachNotificationService.js
export async function notifyBreachAffectedUsers(userIds, breachDetails) {
  for (const userId of userIds) {
    const user = await User.findById(userId);
    
    await sendEmail(user.email, 'Security Incident Notification', `
      We are writing to inform you of a security incident that may have affected your account.
      
      What happened: ${breachDetails.summary}
      What data was affected: ${breachDetails.dataTypes}
      What we're doing: ${breachDetails.remediationSteps}
      What you should do: ${breachDetails.userActions}
      
      For questions, contact security@signaltrue.ai
    `);
  }
  
  // Log notification sent
  await AuditLog.create({
    action: 'BREACH_NOTIFICATION_SENT',
    details: { userCount: userIds.length, breachId: breachDetails.id }
  });
}
```

**GDPR Requirement**: Notify data protection authority within 72 hours

**SOC 2 Requirement**: Document incident in annual audit report

---

### **Common Attack Vectors & Mitigations**

| Attack | Mitigation |
|--------|------------|
| **Credential Stuffing** | Rate limiting (#1), account lockout (#5), 2FA (future) |
| **SQL/NoSQL Injection** | Input validation (#2), parameterized queries (✅ Mongoose) |
| **XSS** | Input sanitization (#2), CSP headers (#6) |
| **CSRF** | CSRF tokens (#4) |
| **DDoS** | Cloudflare/AWS Shield, rate limiting (#1) |
| **OAuth Token Theft** | Short-lived tokens, token rotation, HTTPS only |
| **Session Hijacking** | HTTP-only cookies, secure flag, SameSite=Strict |
| **Man-in-the-Middle** | TLS 1.3, HSTS (#6), certificate pinning (future) |

---

## 🔐 **RECOMMENDED SECURITY ENHANCEMENTS**

### **Phase 1: Immediate (This Week)**
1. ✅ Implement rate limiting (#1)
2. ✅ Add input validation/sanitization (#2)
3. ✅ Fix logging to redact sensitive data (#3)
4. ✅ Strengthen password policy (#5)
5. ✅ Add security headers via Helmet (#6)

### **Phase 2: Short-Term (Next Month)**
6. ✅ Add CSRF protection (#4)
7. ✅ Implement audit logging (#7)
8. ✅ Set up secrets management (#9)
9. ✅ Create incident response runbook
10. ✅ Enable MongoDB encryption at rest (#10)

### **Phase 3: Medium-Term (Next Quarter)**
11. ✅ SOC 2 Type II certification
12. ✅ Penetration testing (hire external firm)
13. ✅ Implement 2FA for admin accounts
14. ✅ Add intrusion detection system (IDS)
15. ✅ Set up automated vulnerability scanning (Snyk, Dependabot)

### **Phase 4: Long-Term (Next Year)**
16. ✅ ISO 27001 certification
17. ✅ Bug bounty program (HackerOne)
18. ✅ Zero-trust network architecture
19. ✅ End-to-end encryption for all data
20. ✅ Formal security training for all employees

---

## 📝 **SECURITY CHECKLIST FOR DEPLOYMENT**

### **Before Production Launch**:
- [ ] All critical vulnerabilities fixed (#1-5)
- [ ] Security headers configured (#6)
- [ ] Audit logging enabled (#7)
- [ ] Secrets stored in vault (#9)
- [ ] Incident response plan documented
- [ ] GDPR compliance verified
- [ ] Penetration test completed
- [ ] Security training for team
- [ ] Insurance policy in place (cyber liability)
- [ ] Legal review of Terms of Service & Privacy Policy

---

## 🛡️ **MONITORING & ALERTING**

### **Set Up Security Monitoring**:

```javascript
// Install: npm install @sentry/node
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Redact sensitive data before sending to Sentry
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers['Authorization'];
    }
    return event;
  }
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### **Alerts to Configure**:
- Failed login attempts > 10 per minute
- API 500 errors > 5 per hour
- Database connection failures
- OAuth token refresh failures
- Unusual data access patterns (e.g., user accessing 100+ teams)
- Crisis events detected (via crisis detection service)

---

## 📞 **SECURITY CONTACT**

**Security Team Email**: security@signaltrue.ai  
**Emergency Hotline**: [TBD]  
**Vulnerability Disclosure**: security@signaltrue.ai  
**PGP Key**: [TBD - generate GPG key for encrypted reports]

---

**Document Version**: 1.0  
**Last Reviewed**: January 10, 2026  
**Next Review**: April 10, 2026  
**Owner**: IT Security Team
