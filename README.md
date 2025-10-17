# DEFRAG API

This repository contains the source code for the DEFRAG API, a Cloudflare Worker-based API for various services.

## Repository Structure

The repository is organized as follows:

-   `.github/`: Contains GitHub Actions workflows for CI/CD.
-   `docs/`: Contains API documentation, including an OpenAPI spec and a Postman collection.
-   `migrations/`: Contains database migrations for D1.
-   `src/`: Contains the source code for the Cloudflare Worker.
-   `tests/`: Contains tests for the Cloudflare Worker.

## Getting Started

To get started, you will need to have Node.js and npm installed.

1.  Clone the repository:
    ```bash
    git clone https://github.com/cjo93/1993-.git
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Run the tests:
    ```bash
    npm test
    ```

## Deployment

The API is deployed to Cloudflare Workers. The deployment is handled automatically by the CI/CD pipeline when changes are pushed to the `main` branch.