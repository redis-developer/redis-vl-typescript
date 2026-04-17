import { createClient } from 'redis';
import { execSync } from 'child_process';
import path from 'path';

/**
 * Global setup for all tests
 * Runs once before all test suites
 *
 * Starts Redis Stack Docker container and verifies it's ready
 */
export async function setup() {
    console.time('⏱️  global-setup');

    const composeFile = path.join(__dirname, 'docker-compose.yml');
    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

    try {
        // In GitHub Actions, use the service container
        if (isGitHubActions) {
            console.log('🔍 Running in GitHub Actions - using service container');
            const client = createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
            });

            await client.connect();
            const pingResult = await client.ping();
            await client.quit();

            if (pingResult !== 'PONG') {
                throw new Error('GitHub Actions Redis service container not accessible');
            }

            console.log('✅ Redis service container is ready');
            console.timeEnd('⏱️  global-setup');
            return;
        }

        // Local development: Start our own Docker container
        console.log('📦 Local development - starting Docker container...');

        // Check if there's an existing Docker container on port 6379
        try {
            const existingContainers = execSync(
                `docker ps --filter "publish=6379" --format "{{.Names}}"`,
                { encoding: 'utf-8' }
            ).trim();

            if (existingContainers) {
                console.log(`⚠️  Found existing container on port 6379: ${existingContainers}`);
                console.log('🛑 Stopping existing containers...');
                execSync(`docker stop ${existingContainers}`, { stdio: 'inherit' });
            }
        } catch (error) {
            // Ignore errors - no existing containers
        }

        // Start Redis Stack container
        console.log('🐳 Starting Redis Stack container...');
        execSync(`docker compose -f ${composeFile} up -d`, {
            stdio: 'inherit',
        });

        // Wait for Redis to be healthy
        console.log('⏳ Waiting for Redis to be ready...');
        execSync(`docker compose -f ${composeFile} exec -T redis redis-cli ping`, {
            stdio: 'pipe',
            timeout: 30000,
        });

        // Verify connection from Node
        const client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });

        await client.connect();
        const pingResult = await client.ping();
        await client.quit();

        if (pingResult !== 'PONG') {
            throw new Error('Redis ping failed');
        }

        console.log('✅ Redis Stack is ready for testing');
    } catch (error) {
        console.error('❌ Failed to start Redis:', error);
        // Cleanup on failure
        try {
            execSync(`docker compose -f ${composeFile} down -v`, { stdio: 'inherit' });
        } catch {
            // Ignore cleanup errors
        }
        throw error;
    }

    console.timeEnd('⏱️  global-setup');
}

/**
 * Global teardown for all tests
 * Runs once after all test suites
 *
 * Stops and removes the Redis Stack Docker container (local dev only)
 * In GitHub Actions, the service container is managed by GitHub
 *
 * Usage:
 *   npm test                  # Stops container after tests (local dev)
 *   NO_CLEANUP=true npm test  # Keeps container running for debugging
 */
export async function teardown() {
    console.time('⏱️  global-teardown');

    const composeFile = path.join(__dirname, 'docker-compose.yml');
    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
    const noCleanup = process.env.NO_CLEANUP === 'true';

    // In GitHub Actions, service container is managed by GitHub
    if (isGitHubActions) {
        console.log('⏭️  GitHub Actions - service container managed by GitHub');
        console.timeEnd('⏱️  global-teardown');
        return;
    }

    // Local development: Stop our Docker container
    if (noCleanup) {
        console.log('⏭️  Keeping container running (NO_CLEANUP=true)');
        console.timeEnd('⏱️  global-teardown');
        return;
    }

    try {
        console.log('🐳 Stopping Redis Stack container...');
        execSync(`docker compose -f ${composeFile} down -v`, {
            stdio: 'inherit',
        });
        console.log('✅ Container stopped and removed');
    } catch (error) {
        console.error('❌ Failed to stop container:', error);
        // Don't throw - cleanup failure shouldn't fail the test suite
    }

    console.timeEnd('⏱️  global-teardown');
}
