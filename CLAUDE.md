# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Passkey Kit is a TypeScript SDK for creating and managing Stellar smart wallets using passkeys/WebAuthn. It consists of client-side (`PasskeyKit`) and server-side (`PasskeyServer`) components. The project is a pnpm workspace with multiple packages and includes Rust Soroban smart contracts.

**Important**: This is demo code that has not been audited - do not use for production systems handling real assets.

## Development Commands

### Build Commands
- `pnpm run build` - Builds all packages (SAC SDK, Passkey Kit SDK, and main types)
- `pnpm run build:sac` - Builds only the SAC SDK package  
- `pnpm run build:pks` - Builds only the Passkey Kit SDK package
- `pnpm run prepublishOnly` - Runs full build (used before publishing)

### Demo Application
- `cd ./demo && pnpm i && pnpm run start` - Run the demo application
- `pnpm run build:demo` - Build the demo for deployment
- `pnpm run deploy:demo` - Deploy demo to Cloudflare Pages
- `pnpm run deploy:demo:prod` - Deploy demo to production environment

### Smart Contract Development
- `cd contracts && make build` - Build all Rust contracts
- `cd contracts && make upload` - Upload contracts to Stellar
- `cd contracts && make bindings` - Generate TypeScript bindings from contracts
- `cd contracts && make fmt` - Format Rust code
- `cd contracts && make clean` - Clean build artifacts

### Testing
No automated test scripts are configured in package.json. Tests exist in:
- `bun_tests/` directory for bun-based tests
- `contracts/smart-wallet/src/tests/` for Rust contract tests

## Architecture

### Workspace Structure
This is a pnpm workspace with packages in `packages/`:
- `passkey-kit-sdk` - Generated TypeScript bindings for smart wallet contracts
- `sac-sdk` - Generated TypeScript bindings for SAC (Stellar Asset Contract)

### Core Components

#### Client-Side (`src/kit.ts`)
- `PasskeyKit` class extends `PasskeyBase`
- Handles WebAuthn registration and authentication in browsers
- Manages smart wallet deployment and transactions
- Uses `@simplewebauthn/browser` for WebAuthn operations

#### Server-Side (`src/server.ts`) 
- `PasskeyServer` class extends `PasskeyBase`
- Integrates with Launchtube for transaction submission
- Integrates with Mercury for event indexing and signer tracking
- Handles server-side wallet operations

#### Base Class (`src/base.ts`)
- `PasskeyBase` provides common functionality
- RPC client setup and basic operations

#### Smart Account Client (`src/sac.ts`)
- `SACClient` for Stellar Asset Contract operations

### Key Directories
- `src/` - Main TypeScript SDK source code
- `contracts/` - Rust Soroban smart contracts
- `demo/` - Svelte demo application showcasing SDK usage
- `zephyr/` - Mercury Zephyr indexing program for event processing
- `packages/` - Generated contract bindings (heavily modified)

### External Dependencies
- `@stellar/stellar-sdk` - Core Stellar blockchain interactions
- `@simplewebauthn/browser` - WebAuthn client operations  
- `@simplewebauthn/types` - WebAuthn type definitions

## Telemetry

The project includes OpenTelemetry tracing support:
- Configured via `src/telemetry/TelemetryService.ts`
- Environment variables: `TELEMETRY_ENABLED`, `TELEMETRY_SERVICE_NAME`, `TELEMETRY_EXPORTER_TYPE`, `TELEMETRY_OTLP_ENDPOINT`
- Supports OTLP, console, and custom exporters

## TypeScript Configuration

- Uses ESNext modules with bundler resolution
- Declaration files output to `./types`
- Strict mode enabled
- When using in NextJS, must include in `transpilePackages` due to no JS build

## Important Notes

- Generated bindings in `packages/` have been heavily modified - be careful when rebuilding
- Smart contracts use secp256r1 signatures from passkeys
- Mercury Zephyr deployment required for signer tracking functionality
- No automated linting or type checking commands are configured