# Performance Testing

This directory contains load testing scripts for the AIMS Backend.

## Prerequisites

1.  **k6**: You need to install k6 to run the load tests.
    *   [Install k6 Guide](https://k6.io/docs/get-started/installation/)

## Scripts

### `load-test.js`

This script simulates a student workflow:
1.  Logs in (generates JWT token).
2.  Fetches available exams.
3.  Starts an exam attempt.
4.  Submits answers.

## Running the Test

1.  Start your backend server:
    ```bash
    cd aims_backend
    npm run start
    ```

2.  Run the load test:
    ```bash
    k6 run test/performance/load-test.js
    ```

## Configuration

The script defaults to `http://localhost:3001` (where the backend runs locally).
You can modify the `BASE_URL` variable in `load-test.js` or override it via environment variables if you modify the script to support them.
