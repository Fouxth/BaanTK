# BaanTK v2.0 - Production Deployment Guide

## 🎯 Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Firebase project created and configured
- [ ] LINE LIFF app registered
- [ ] Environment variables configured (.env file)
- [ ] Service account keys generated
- [ ] Domain verification completed

### 2. Security Configuration
- [ ] Admin tokens generated and secured
- [ ] JWT secrets configured
- [ ] Encryption keys set up
- [ ] CORS origins verified
- [ ] Rate limiting configured

### 3. Database Setup
- [ ] Firestore rules deployed
- [ ] Database indexes created
- [ ] Storage rules configured
- [ ] Backup strategy implemented

## 🚀 Deployment Steps

### Step 1: Install Dependencies
```bash
cd functions
npm install
```

### Step 2: Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_PRIVATE_KEY="your-private-key"
# FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
# LINE_CHANNEL_ACCESS_TOKEN=your-line-token
# LINE_CHANNEL_SECRET=your-line-secret
# ADMIN_SECRET_TOKEN=your-super-secure-admin-token
# JWT_SECRET=your-jwt-secret-key
# ENCRYPTION_KEY=your-32-character-encryption-key
```

### Step 3: Deploy Infrastructure
```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules,firestore:indexes

# Deploy storage rules
firebase deploy --only storage

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy hosting (if using Firebase Hosting)
firebase deploy --only hosting
```

### Step 4: Verify Deployment
```bash
# Test health endpoint
curl https://your-project-id.cloudfunctions.net/webhook

# Test admin login
curl -X POST https://your-project-id.cloudfunctions.net/webhook/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"token":"your-admin-token"}'
```

## 🔧 Post-Deployment Configuration

### 1. LINE LIFF Configuration
```javascript
// Update LIFF endpoint URL in LINE Developer Console
Endpoint URL: https://your-project-id.cloudfunctions.net/webhook/api/liff-register
```

### 2. Admin Dashboard Access
```
Admin URL: https://your-project-id.web.app/admin.html
Default Token: your-admin-token (configured in .env)
```

### 3. Monitoring Setup
- Configure Firebase Performance Monitoring
- Set up Error Reporting alerts
- Enable Cloud Logging
- Configure uptime monitoring

## 🧪 Testing & Validation

### 1. Registration Flow Test
```bash
# Test user registration
curl -X POST "https://your-domain/api/liff-register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "สมชาย",
    "lastName": "ใจดี",
    "birthDate": "15/05/1990",
    "idCard": "1234567890123",
    "address": "123 ถ.สุขุมวิท กรุงเทพฯ",
    "amount": 5000,
    "frequency": "monthly",
    "userId": "U1234567890abcdef1234567890abcdef"
  }'
```

### 2. Admin Functions Test
```bash
# Get admin token
TOKEN=$(curl -s -X POST "https://your-domain/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"token":"your-admin-token"}' | jq -r '.token')

# Test borrower list
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-domain/api/admin/borrowers"

# Test dashboard stats
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-domain/api/admin/dashboard-stats"
```

### 3. Security Tests
```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST "https://your-domain/api/liff-register" \
    -H "Content-Type: application/json" \
    -d '{"test":"rate-limit"}'
done

# Test invalid token
curl -H "Authorization: Bearer invalid-token" \
  "https://your-domain/api/admin/borrowers"
```

## 📊 Monitoring & Maintenance

### 1. Key Metrics to Monitor
- Response times and latency
- Error rates and types
- Registration success rates
- Admin action frequencies
- Security incident alerts

### 2. Daily Checks
- [ ] System health status
- [ ] Error log review
- [ ] Pending applications count
- [ ] Security alerts review

### 3. Weekly Reports
- [ ] Application volume trends
- [ ] Approval/rejection rates
- [ ] Payment collection rates
- [ ] System performance metrics

## 🔒 Security Hardening

### 1. Production Security Settings
```javascript
// Additional security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 2. Access Control
- Implement IP whitelisting for admin access
- Set up VPN requirements for sensitive operations
- Enable audit logging for all admin actions
- Regular security key rotation

### 3. Data Protection
- Encrypt sensitive data at rest
- Implement data retention policies
- Set up automated backups
- Regular penetration testing

## 🚨 Incident Response

### 1. Security Incidents
1. **Immediate Actions**:
   - Review security logs
   - Identify affected systems
   - Implement temporary blocks

2. **Investigation**:
   - Collect forensic evidence
   - Analyze attack patterns
   - Assess damage scope

3. **Recovery**:
   - Patch vulnerabilities
   - Restore affected data
   - Update security measures

### 2. System Outages
1. **Detection**: Automated monitoring alerts
2. **Assessment**: Determine impact and cause
3. **Response**: Implement recovery procedures
4. **Communication**: Update stakeholders
5. **Post-mortem**: Document and improve

## 📞 Support & Contact

### Development Team
- **Lead Developer**: [Your Name]
- **System Administrator**: [Admin Name]
- **Security Officer**: [Security Contact]

### External Support
- **Firebase Support**: Google Cloud Support
- **LINE Developer Support**: developers.line.biz

### Emergency Contacts
- **24/7 Hotline**: [Emergency Number]
- **Email**: support@your-company.com
- **Slack**: #baantk-incidents

---

**Deployment Date**: [Date]  
**Version**: 2.0.0  
**Environment**: Production  
**Next Review**: [Date + 3 months]
