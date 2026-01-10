# 🛡️ SignalTrue Enterprise Security Documentation

**Last Updated:** January 10, 2026  
**Security Level:** Enterprise-Ready  
**Compliance:** GDPR, SOC 2 Type II Ready, HIPAA-Adjacent

---

## 🎯 Executive Summary for IT Managers

SignalTrue has implemented **enterprise-grade security controls** to protect sensitive behavioral data from Slack, Google Workspace, and Microsoft 365.

### Security Highlights:
✅ **Rate limiting** on all endpoints (DDoS protection)  
✅ **Input validation** & sanitization (injection attack prevention)  
✅ **Security headers** (XSS, clickjacking, MIME sniffing protection)  
✅ **Role-based access control** (RBAC with 4 roles)  
✅ **OAuth token encryption** (AES-256-GCM at rest)  
✅ **Audit logging** for compliance  
✅ **Behavioral monitoring** for anomaly detection  
✅ **Privacy by design** (team-level aggregation, 5-person minimum)

---

## 🔐 Implemented Security Controls

### 1. Rate Limiting (Anti-DDoS)

**Purpose:** Prevent brute force attacks, credential stuffing, and API abuse

**Implementation:**
- **General API:** 100 requests per 15 minutes per IP
- **Auth endpoints:** 5 attempts per 15 minutes per IP
- **Intelligence endpoints:** 20 requests per minute
- **Admin endpoints:** 30 requests per 5 minutes
- **Password reset:** 3 requests per hour

**Code:** `backend/middleware/security.js`

**Headers Returned:**
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1704891600
```

---

### 2. Input Validation & Sanitization

**Purpose:** Prevent NoSQL injection, XSS, and command injection attacks

**Protections:**
- **MongoDB injection:** Removes `$` and `.` from user input
- **HTTP Parameter Pollution:** Prevents duplicate query parameters
- **XSS prevention:** Sanitizes HTML/script tags
- **Path traversal:** Blocks `../` patterns

**Implementation:** 
- `express-mongo-sanitize` for NoSQL injection
- `hpp` for parameter pollution
- Custom regex patterns for suspicious activity detection

**Code:** `backend/middleware/security.js`

---

### 3. Security Headers

**Purpose:** Protect against XSS, clickjacking, MIME sniffing, and other client-side attacks

**Headers Applied:**
```
Content-Security-Policy: default-src 'self'; script-src 'self'; img-src 'self' data: https:
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

**Implementation:** `helmet` package with custom CSP directives

**Code:** `backend/middleware/security.js`

---

### 4. Authentication & Authorization

**Architecture:** JWT-based authentication with role-based access control (RBAC)

**Roles:**
1. **`master_admin`** - Full system access, org creation, all data
2. **`admin`** - Org management, team creation, settings
3. **`hr_admin`** - Access to people data (attrition, manager effectiveness)
4. **`user`** - View team-level aggregated data only

**Token Security:**
- HS256 algorithm (HMAC with SHA-256)
- 7-day expiration (configurable)
- Stored in `Authorization: Bearer <token>` header
- Payload includes: `userId`, `email`, `role`, `teamId`, `orgId`

**Middleware:**
- `authenticateToken` - Verifies JWT on all protected routes
- `requireAdmin` - Enforces admin/master_admin role
- `requireHROrAdmin` - Enforces hr_admin/admin/master_admin role
- `requireRoles([...])` - Flexible multi-role enforcement

**Code:** `backend/middleware/auth.js`

---

### 5. Data Encryption

**At Rest:**
- **OAuth Tokens:** AES-256-GCM encryption before MongoDB storage
- **Database:** MongoDB Atlas enforces encryption at rest (AES-256)
- **Backups:** Encrypted via MongoDB Atlas

**In Transit:**
- **TLS 1.2+** enforced on all connections
- **HTTPS only** in production (enforced by Vercel/Render)
- **HSTS headers** prevent HTTP downgrade attacks

**Implementation:**
- Custom encryption: `backend/utils/encryption.js`
- MongoDB Atlas encryption: Automatic

---

### 6. Privacy by Design

**Anti-Weaponization Guardrails:**

1. **5-Person Minimum:** Teams with <5 members cannot be queried
2. **Team-Level Only:** No individual-level metrics exposed
3. **Aggregation Enforced:** All metrics must be aggregated
4. **Audit Trail:** Every data access logged for compliance

**Middleware:** `backend/middleware/antiWeaponizationGuards.js`

**Compliance:**
- GDPR Article 25 (Data Protection by Design)
- CCPA Section 1798.100 (Consumer Rights)
- SOC 2 CC6.1 (Logical Access Controls)

---

### 7. Logging & Monitoring

**Security Event Logging:**
- Failed authentication attempts (IP, timestamp, user-agent)
- Admin operations (user, action, IP, timestamp)
- Suspicious activity detection (injection attempts, path traversal)
- Rate limit violations

**Log Retention:**
- **Security logs:** 90 days
- **Audit logs:** 1 year (GDPR compliance)
- **Access logs:** 30 days

**Monitoring Hooks (Ready for Integration):**
- Sentry for error tracking
- LogRocket for session replay
- DataDog for infrastructure monitoring
- PagerDuty for security alerts

**Code:** `backend/middleware/security.js` (securityLogger function)

---

## 🚨 Threat Model & Mitigations

### Threat 1: Brute Force Authentication Attacks
**Mitigation:** 
- Rate limiting (5 attempts per 15 minutes)
- Account lockout after 10 failed attempts (configurable)
- Password complexity requirements (8+ chars, uppercase, lowercase, number)

### Threat 2: OAuth Token Theft
**Mitigation:**
- AES-256-GCM encryption at rest
- Tokens scoped to minimum required permissions
- Token rotation every 7 days
- Revocation on user logout

### Threat 3: Data Exfiltration
**Mitigation:**
- Team-level aggregation (no individual metrics)
- 5-person minimum enforcement
- Audit trail for all data access
- Rate limiting prevents bulk extraction

### Threat 4: Insider Threats
**Mitigation:**
- Role-based access control
- Audit logging of all admin actions
- Separation of duties (HR vs. Admin roles)
- Data access logs for compliance reviews

### Threat 5: DDoS Attacks
**Mitigation:**
- Rate limiting (100 req/15min per IP)
- Cloudflare DDoS protection (optional add-on)
- Render auto-scaling for traffic spikes

### Threat 6: Injection Attacks (SQL/NoSQL/XSS)
**Mitigation:**
- Input sanitization (mongo-sanitize)
- Parameterized queries (Mongoose)
- Content Security Policy headers
- Suspicious activity detection

---

## 📋 Compliance & Certifications

### GDPR Compliance

**Article 5 (Data Minimization):**
✅ Only collect behavioral metadata (no message content)  
✅ Team-level aggregation (no individual tracking)

**Article 25 (Privacy by Design):**
✅ 5-person minimum enforcement  
✅ Aggregation-only architecture

**Article 30 (Records of Processing):**
✅ Audit trail in `ConsentAudit` collection  
✅ Data access logs for 1 year

**Article 32 (Security of Processing):**
✅ Encryption at rest and in transit  
✅ Access controls (RBAC)  
✅ Regular security monitoring

**Article 33 (Breach Notification):**
✅ Incident response procedures documented  
✅ 72-hour breach notification process

### SOC 2 Type II Readiness

**CC6.1 (Logical Access Controls):**
✅ Multi-factor authentication ready (OAuth)  
✅ Role-based access control  
✅ Token expiration policies

**CC6.6 (Encryption):**
✅ TLS 1.2+ for data in transit  
✅ AES-256 for sensitive data at rest

**CC7.2 (Monitoring):**
✅ Security event logging  
✅ Anomaly detection  
✅ Audit trails

**CC9.2 (Risk Mitigation):**
✅ Threat model documented  
✅ Security controls implemented  
✅ Regular vulnerability assessments

### HIPAA-Adjacent Compliance

**Note:** SignalTrue does not process PHI (Protected Health Information) directly, but behavioral health data may be considered sensitive.

**Administrative Safeguards:**
✅ Access controls (§164.308(a)(4))  
✅ Audit controls (§164.312(b))  
✅ Encryption (§164.312(a)(2)(iv))

---

## 🔧 Security Configuration

### Environment Variables (Required)

```bash
# Authentication
JWT_SECRET=<64-character-random-string>  # CRITICAL
API_KEY=<32-character-random-string>     # For admin endpoints

# Database
MONGO_URI=mongodb+srv://...              # Must use TLS

# Encryption
ENCRYPTION_KEY=<64-character-hex-string> # For AES-256-GCM

# OAuth
SLACK_CLIENT_SECRET=<secret>
GOOGLE_CLIENT_SECRET=<secret>
MICROSOFT_CLIENT_SECRET=<secret>

# Email
RESEND_API_KEY=<key>                     # For notifications

# Rate Limiting (Optional Overrides)
RATE_LIMIT_WINDOW_MS=900000              # 15 minutes (default)
RATE_LIMIT_MAX_REQUESTS=100              # Per window (default)
AUTH_LIMIT_MAX=5                         # Auth attempts (default)
```

### Security Headers Verification

Test your deployment:
```bash
curl -I https://api.signaltrue.ai/api/health

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: default-src 'self'
```

---

## 🚨 Incident Response

### Severity Levels

**P0 - Critical (Immediate Response)**
- Data breach or unauthorized access
- Complete service outage
- Authentication bypass discovered

**P1 - High (< 4 hours)**
- DDoS attack in progress
- OAuth token compromise
- Failed security controls

**P2 - Medium (< 24 hours)**
- Suspicious activity detected
- Rate limit violations
- Failed login attempts spike

**P3 - Low (< 7 days)**
- Security audit findings
- Minor configuration issues

### Incident Response Procedure

1. **Detection** - Security logs, monitoring alerts, user reports
2. **Containment** - Revoke tokens, block IPs, disable compromised accounts
3. **Investigation** - Review audit logs, identify scope, determine root cause
4. **Remediation** - Fix vulnerability, rotate credentials, patch systems
5. **Notification** - Inform affected users (GDPR 72-hour requirement)
6. **Post-Mortem** - Document incident, improve controls, update runbooks

### Emergency Contacts

- **Security Team:** security@signaltrue.ai
- **On-Call Engineer:** Available 24/7 via PagerDuty
- **DPO (Data Protection Officer):** dpo@signaltrue.ai

---

## 📊 Security Metrics & KPIs

### Monthly Security Dashboard

- **Failed Auth Attempts:** < 0.1% of total login attempts
- **Rate Limit Violations:** < 10 per day
- **Suspicious Activity Detections:** Reviewed within 24 hours
- **Security Patches:** Applied within 7 days of release
- **Audit Log Completeness:** 100%
- **Encryption Coverage:** 100% of sensitive data

---

## 🔄 Security Maintenance Schedule

### Daily
- ✅ Review security event logs
- ✅ Monitor rate limit violations
- ✅ Check failed authentication attempts

### Weekly
- ✅ Review suspicious activity reports
- ✅ Verify backup integrity
- ✅ Update security documentation

### Monthly
- ✅ Dependency vulnerability scan (`npm audit`)
- ✅ Access control review (remove inactive users)
- ✅ Security metrics reporting

### Quarterly
- ✅ Penetration testing
- ✅ Security training for team
- ✅ Compliance audit (GDPR, SOC 2)
- ✅ Incident response drill

---

## ✅ Security Checklist for IT Managers

**Before Production Deployment:**

- [ ] `JWT_SECRET` is 64+ characters and randomly generated
- [ ] `ENCRYPTION_KEY` is 64 hex characters
- [ ] `API_KEY` is set and documented
- [ ] MongoDB uses TLS connection
- [ ] HTTPS enforced (no HTTP allowed)
- [ ] Rate limiting verified on all endpoints
- [ ] Security headers present (check with curl)
- [ ] Audit logging enabled
- [ ] Backup encryption verified
- [ ] OAuth tokens encrypted at rest
- [ ] CORS whitelist configured for production domain
- [ ] Dependency vulnerabilities resolved (`npm audit`)
- [ ] Security monitoring integrated (Sentry/DataDog)
- [ ] Incident response plan documented
- [ ] Team trained on security procedures

---

## 📞 Support & Questions

**Security Questions:** security@signaltrue.ai  
**Compliance Inquiries:** compliance@signaltrue.ai  
**Vulnerability Reports:** security@signaltrue.ai (PGP key available)

**Bug Bounty Program:** Coming soon

---

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [SOC 2 Trust Services Criteria](https://www.aicpa.org/soc)

---

**Version:** 2.0  
**Classification:** Public  
**Maintained by:** SignalTrue Security Team

