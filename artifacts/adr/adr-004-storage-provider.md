# ADR-004: Cloudinary & Local Storage Provider Abstraction
**Category: Storage**

## Status
Approved

## Context
The system supports document uploading (resumes, passport copies, contracts). The storage layer must be abstract to support both local development sandboxing and cloud deployments.

## Decision
We implemented the `IStorageProvider` interface, providing a **CloudinaryProvider** for production and **LocalFileProvider** for local development.

## Alternatives Considered
*   **AWS S3**: An excellent choice, but Cloudinary offers built-in PDF and image transformations and inline headers.

## Consequences
*   **Pros**: Swapping storage targets is managed by configuring the `STORAGE_PROVIDER` env variable.
*   **Cons**: Cloudinary uploads are synchronous.
