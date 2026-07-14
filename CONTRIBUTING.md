# Contributing

Behavior here is governed by
[kilden-sdk-spec](https://github.com/freshworkstudio/kilden-sdk-spec): the
spec document, the frozen test vectors and the mock capture server. A PR that
changes observable behavior without a matching spec change will be rejected —
five SDKs stay identical only if the spec moves first.

Bug fixes, typing improvements, docs and performance work that keep behavior
intact are always welcome directly.

## Setup

```sh
npm install
npm run check        # typecheck + full suite
```

The integration tests boot the spec repo's mock server, so you need a
checkout of kilden-sdk-spec as a sibling directory (or set `KILDEN_SPEC_DIR`)
and a Go toolchain. `npm run test:unit` skips those.

## Questions

[Discussions](https://github.com/freshworkstudio/kilden-sdk-node/discussions),
please — answers there stay searchable.
