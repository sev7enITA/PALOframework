# PALO n8n node tooling

Private, non-publishable build toolchain for `../n8n-nodes-palo-ai`.

The official n8n community-node validator forbids dependency overrides in the published node manifest. This sibling package keeps the published node runtime-dependency free while constraining vulnerable transitive build dependencies to patched versions. `run-bin.mjs` executes the pinned tool binaries from this directory, preserves the community-node project as the working directory and exposes only the unmodified official ESLint configuration through a generated development symlink.

Node.js 24 is required for clean installation and verification. CI must install both lockfiles, run `npm run security:audit` from the community-node directory and only then run the package verification and publication gates.
