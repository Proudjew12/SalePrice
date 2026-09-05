# Security policy

## Reporting

Report suspected vulnerabilities privately to the project owner. Do not publish credentials, exploit details, or personal data in a public issue.

## Baseline rules

- Keep secrets in local environment files or a deployment secret manager, never in source control.
- Browser `VITE_*` values are public; production-required secrets must have no hard-coded fallback.
- Treat every browser, API, file, database, and third-party value as untrusted input. Apply meaningful
  type, length, range, and format constraints.
- Validate request shapes at the API boundary and authorize every protected operation and object
  ownership server-side. Hidden UI controls are not authorization.
- Use parameterized database access through a maintained driver or ORM.
- Return generic client errors; keep request-correlated operational detail in structured logs
  without credentials, cookies, tokens, or unnecessary personal data.
- Restrict production CORS to known origins. Use secure session settings and protect state-changing
  browser requests against CSRF when the authentication model requires it.
- Use migrations for persistent storage. Validate uploads by size and content, use generated storage
  names, and keep untrusted files outside executable source paths.
- Bound external calls, result sizes, and expensive operations; add timeouts and abuse controls
  where needed. Define sensitive-data retention and backup/restore procedures before production use.
- Pin direct dependencies and review automated update pull requests.
- Run `npm run check` before merging.

Add product-specific security guidance here as authentication, persistence, or integrations are
introduced.
