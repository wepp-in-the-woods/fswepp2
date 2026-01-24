# Agent Notes

## Dev environment networking
- Caddy listens on `:8091` without TLS by design.
- This is intentional for the dev stack where TLS is terminated upstream (e.g., HAProxy).
