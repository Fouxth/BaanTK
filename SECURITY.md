# BaanTK Security & Operations Guide

## 🔐 Security Implementation

### Authentication & Authorization
- **JWT Tokens**: 8-hour expiration, secure generation
- **Rate Limiting**: 100 requests/15min general, 3 registrations/hour
- **Input Validation**: Joi schemas with Thai ID validation
- **SQL Injection Protection**: Parameterized queries only
- **XSS Prevention**: Input sanitization and output encoding

### Data Protection
- **Encryption**: AES-256 for sensitive data
- **PII Masking**: ID cards masked in logs and responses
- **Secure Headers**: Helmet.js implementation
- **CORS**: Strict origin whitelist

### Monitoring & Alerting
- **Security Logs**: All security events tracked
- **Error Logging**: Comprehensive error capture
- **Performance Monitoring**: Response time tracking
- **Audit Trail**: Complete admin action history

## 🚨 Emergency Procedures

### Security Incidents
1. **Immediate Response**:
   - Check security logs: `/api/admin/logs?type=security`
   - Review affected accounts
   - Implement temporary blocks if needed

2. **Investigation**:
   - Export relevant logs for analysis
   - Check IP patterns and user agents
   - Verify system integrity

3. **Recovery**:
   - Update security measures
   - Notify affected users
   - Document incident for future reference

### System Outages
1. **Check Firebase Status**: https://status.firebase.google.com
2. **Review Function Logs**: Firebase Console > Functions > Logs
3. **Monitor Error Rates**: Check dashboard statistics
4. **Escalate if needed**: Contact Firebase support

## 📊 Operational Procedures

### Daily Operations
- [ ] Check dashboard statistics
- [ ] Review pending applications
- [ ] Monitor error logs
- [ ] Verify payment notifications

### Weekly Operations
- [ ] Export application reports
- [ ] Review blacklist entries
- [ ] Analyze credit score trends
- [ ] Update risk parameters if needed

### Monthly Operations
- [ ] Comprehensive security review
- [ ] Performance optimization
- [ ] Backup verification
- [ ] Compliance audit

## 🔧 Configuration Management

### Environment Variables
```bash
# Production Settings
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
REGISTRATION_LIMIT_MAX=3

# Security Keys
ADMIN_SECRET_TOKEN=<strong-secret>
JWT_SECRET=<jwt-secret>
ENCRYPTION_KEY=<32-char-key>

# Firebase
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_PRIVATE_KEY=<private-key>
FIREBASE_CLIENT_EMAIL=<service-account>

# LINE Integration
LINE_CHANNEL_ACCESS_TOKEN=<line-token>
LINE_CHANNEL_SECRET=<line-secret>
```

### Firebase Security Rules
```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /borrowers/{borrowerId} {
      allow read: if request.auth != null && 
        (request.auth.token.admin == true || 
         request.auth.uid == resource.data.userId);
      allow write: if request.auth != null && 
        request.auth.token.admin == true;
    }
    match /blacklist/{blacklistId} {
      allow read, write: if request.auth != null && 
        request.auth.token.admin == true;
    }
  }
}
```

## 📈 Performance Optimization

### Database Optimization
- **Indexes**: Optimized for common queries
- **Pagination**: Limit large result sets
- **Caching**: Firebase caching enabled
- **Connection Pooling**: Firestore connection optimization

### Function Optimization
- **Cold Start Mitigation**: Keep functions warm
- **Memory Allocation**: Optimized memory usage
- **Timeout Configuration**: Appropriate timeout settings
- **Error Handling**: Graceful error recovery

## 🧪 Testing & Quality Assurance

### Testing Checklist
- [ ] Registration flow (valid/invalid data)
- [ ] Admin authentication
- [ ] Credit scoring accuracy
- [ ] Blacklist functionality
- [ ] Rate limiting effectiveness
- [ ] Error handling robustness

### Load Testing
```bash
# Test registration endpoint
curl -X POST "https://your-domain/api/liff-register" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User",...}'

# Test admin endpoints
curl -X GET "https://your-domain/api/admin/borrowers" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔄 Backup & Recovery

### Data Backup
- **Automatic**: Firebase automatic backups
- **Manual**: Export critical data weekly
- **Retention**: 90-day backup retention
- **Testing**: Monthly backup restore tests

### Recovery Procedures
1. **Data Loss**: Restore from Firebase backup
2. **Function Failure**: Redeploy from source
3. **Configuration Loss**: Restore from environment backups
4. **Complete Disaster**: Full system rebuild from documentation

## 📞 Contact & Support

### Emergency Contacts
- **System Administrator**: [Your Contact]
- **Firebase Support**: Google Cloud Support
- **LINE Developer Support**: LINE Developer Portal

### Documentation Updates
- Update this guide when making system changes
- Version control all configuration changes
- Maintain change log for audit purposes

---

**Last Updated**: 2025-01-06  
**Version**: 2.0.0  
**Classification**: INTERNAL USE ONLY
