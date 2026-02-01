# Security Policy

## Supported Versions

Currently supported versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in @arcaelas/rag, please report it responsibly.

### How to Report

1. **DO NOT** open a public GitHub issue
2. Send an email to: **arcaela.reyes@gmail.com**
3. Include in your report:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

### What to Expect

1. Acknowledgment of your report
2. Assessment of the vulnerability
3. Development of a fix
4. Release of a security patch
5. Public disclosure (coordinated with you)

### Disclosure Policy

- We follow **coordinated disclosure**
- Security advisories will be published on GitHub Security Advisories
- CVE IDs will be requested for significant vulnerabilities
- Credit will be given to reporters (unless anonymity is requested)

## Security Best Practices

When using @arcaelas/rag:

### Data Security
- Vector database is stored locally on your machine
- No data is sent to external services (except Ollama if configured remotely)
- Ensure proper file permissions on `~/.cache/@arcaelas/rag/data/`

### Ollama Configuration
- Use `http://localhost:11434` for local-only access
- If using remote Ollama, ensure it's on a trusted network
- Consider using HTTPS for remote Ollama connections

### JSONL Import
- Validate JSONL files before importing
- Be cautious with JSONL files from untrusted sources
- Review error reports for potential malicious content

### Environment Variables
- Never commit `.env` files with sensitive configurations
- Use environment variable management tools in production
- Restrict access to configuration files

## Known Security Considerations

### Local Storage
- Data is stored unencrypted in `~/.cache/@arcaelas/rag/data/`
- Ensure appropriate file system permissions
- Consider full-disk encryption for sensitive data

### Ollama Integration
- Security depends on your Ollama instance configuration
- Review Ollama's security documentation
- Keep Ollama updated to latest version

### Dependencies
- Regular dependency updates via Dependabot
- Automated security scanning enabled
- Review `yarn audit` output regularly

## Security Updates

Subscribe to security notifications:
- Watch this repository for security advisories
- Enable GitHub security alerts
- Follow [@arcaelas](https://github.com/arcaelas) for announcements

## Attribution

We appreciate the security research community and will acknowledge all valid reports.

Thank you for helping keep @arcaelas/rag secure!
