# Agent Configuration

## Custom Skills Path

**Primary skills directory:** `/Users/bugrasonmez/.gemini/antigravity/skills`

Bu yoldaki skill'ler, genel skill'lere göre **önceliklidir**. Her görevde önce bu yol kontrol edilmeli ve ilgili skill varsa kullanılmalıdır.

### Skill Kategorileri

- **Web Development:** react-modernization, nextjs-app-router-patterns, typescript-advanced-types, tailwind-design-system
- **Frontend:** frontend-code-review, frontend-testing, component-refactoring, responsive-design
- **Backend:** nodejs-backend-patterns, fastapi-templates, dotnet-backend-patterns
- **Testing:** e2e-testing-patterns, javascript-testing-patterns, python-testing-patterns
- **DevOps:** k8s-manifest-generator, terraform-module-library, github-actions-templates
- **Security/Pentest:** API Fuzzing, SQL Injection Testing, XSS Testing, Burp Suite, vb.
- **Database:** postgresql-table-design, sql-optimization-patterns
- **AI/ML:** rag-implementation, llm-evaluation, prompt-engineering-patterns
- **Ve 160+ diğer skill...**

### Kullanım Protokolü

1. Kullanıcı bir görev verdiğinde, önce `/Users/bugrasonmez/.gemini/antigravity/skills` yolunda ilgili skill var mı kontrol et
2. Varsa, o skill'i kullan
3. Yoksa, genel yeteneklerini kullan
