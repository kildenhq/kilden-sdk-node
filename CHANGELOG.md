# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-alpha.2] - 2026-07-14

### Changed

- Repository moved to the kildenhq org; releases publish via OIDC trusted
  publishing (no token).

## [0.1.0-alpha.1] - 2026-07-14

### Added

- `Client` with `track`, `identify`, `alias`, `flush`, `close` — bounded
  in-memory queue, background flush, gzip, frozen retry policy
  (spec §4.3), zero runtime dependencies.
- `IdentitySigner` — HS256 identity tokens in the byte-frozen canonical form,
  verified against the spec vectors.
- `isEnabled` / `getFeatureFlag` — remote evaluation via `/decide` with a
  30s per-id cache and safe defaults.
- Vector runners (payload, identity, flag hashing) and integration tests
  against the spec's mock capture server.

[Unreleased]: https://github.com/kildenhq/kilden-sdk-node/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/kildenhq/kilden-sdk-node/releases/tag/v0.1.0-alpha.1
