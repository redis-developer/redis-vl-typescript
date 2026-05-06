import { createClient } from 'redis';
import {
    GenericContainer,
    Wait,
    getContainerRuntimeClient,
    type StartedTestContainer,
} from 'testcontainers';

const REDIS_IMAGE = 'redis:8.0';
const REDIS_PORT = 6379;
const CONTAINER_LABELS = { 'com.redis.redisvl.test': 'true' } as const;
const CONTAINER_LABEL_FILTERS = Object.entries(CONTAINER_LABELS).map(([k, v]) => `${k}=${v}`);

let startedContainer: StartedTestContainer | undefined;

/**
 * Remove any containers labelled as RedisVL test containers.
 *
 * Used when TESTCONTAINERS_REUSE_ENABLE=false to guarantee a fresh container.
 * Without this, disabling reuse would leave the previously-reused container
 * running while spinning up a new one alongside it.
 */
async function removeLabelledContainers() {
    const runtime = await getContainerRuntimeClient();
    const matches = await runtime.container.dockerode.listContainers({
        all: true,
        filters: { label: CONTAINER_LABEL_FILTERS },
    });

    if (matches.length === 0) {
        return;
    }

    console.log(`🧹 Removing ${matches.length} previous RedisVL test container(s)`);
    for (const info of matches) {
        const container = runtime.container.dockerode.getContainer(info.Id);
        try {
            await container.remove({ force: true, v: true });
        } catch (error) {
            console.warn(`⚠️  Failed to remove container ${info.Id}:`, error);
        }
    }
}

/**
 * Global setup for all tests
 * Runs once before all test suites
 *
 * Starts a Redis container via Testcontainers and exposes its URL via REDIS_URL.
 *
 * Container reuse is enabled by default (the container persists across runs
 * for fast subsequent test runs). To force a fresh container, set
 * TESTCONTAINERS_REUSE_ENABLE=false.
 */
export async function setup() {
    console.time('⏱️  global-setup');

    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

    try {
        // In GitHub Actions, use the service container
        if (isGitHubActions) {
            console.log('🔍 Running in GitHub Actions - using service container');
            const url = process.env.REDIS_URL || 'redis://localhost:6379';
            const client = createClient({ url });

            await client.connect();
            const pingResult = await client.ping();
            await client.quit();

            if (pingResult !== 'PONG') {
                throw new Error('GitHub Actions Redis service container not accessible');
            }

            console.log(`✅ Redis service container is ready at ${url}`);
            console.timeEnd('⏱️  global-setup');
            return;
        }

        // When the user explicitly opts out of reuse, sweep any previously
        // reused container so a true fresh container can take its place.
        if (process.env.TESTCONTAINERS_REUSE_ENABLE === 'false') {
            await removeLabelledContainers();
        }

        console.log(`🐳 Starting Redis container (${REDIS_IMAGE}) via Testcontainers...`);
        startedContainer = await new GenericContainer(REDIS_IMAGE)
            .withExposedPorts(REDIS_PORT)
            .withCommand(['redis-server', '--save', '', '--appendonly', 'no'])
            .withLabels(CONTAINER_LABELS)
            .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
            .withReuse()
            .start();

        const host = startedContainer.getHost();
        const port = startedContainer.getMappedPort(REDIS_PORT);
        process.env.REDIS_URL = `redis://${host}:${port}`;

        // Verify connection and reset state from any previous run (the
        // container is reused across runs, so leftover keys/indexes can
        // otherwise leak between runs).
        const client = createClient({ url: process.env.REDIS_URL });
        await client.connect();
        const pingResult = await client.ping();
        await client.flushAll();
        await client.quit();

        if (pingResult !== 'PONG') {
            throw new Error('Redis ping failed');
        }

        console.log(`✅ Redis is ready to be used for testing RedisVL at ${process.env.REDIS_URL}`);
    } catch (error) {
        console.error('❌ Failed to start Redis:', error);
        throw error;
    }

    console.timeEnd('⏱️  global-setup');
}

/**
 * Global teardown for all tests
 * Runs once after all test suites
 *
 * With container reuse, the container is intentionally left running so
 * subsequent test runs reattach to it (fast startup, inspectable state).
 * In GitHub Actions, the service container is managed by GitHub.
 *
 * To force a fresh container on the next run:
 *   TESTCONTAINERS_REUSE_ENABLE=false npm test
 */
export async function teardown() {
    if (process.env.GITHUB_ACTIONS === 'true') {
        console.log('⏭️  GitHub Actions - service container managed by GitHub');
        return;
    }

    if (!startedContainer) {
        return;
    }

    const port = startedContainer.getMappedPort(REDIS_PORT);
    const url = `redis://default@127.0.0.1:${port}`;
    console.log(`\n⏭️  Keeping Redis container running for reuse.`);
    console.log(`Inspect test data at ${url} using redis-cli or Redis Insight\n`);
}
