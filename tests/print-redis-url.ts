import { getContainerRuntimeClient } from 'testcontainers';

const CONTAINER_LABEL = 'com.redis.redisvl.test=true';
const REDIS_PORT = 6379;

async function main() {
    const runtime = await getContainerRuntimeClient();
    const containers = await runtime.container.dockerode.listContainers({
        filters: { label: [CONTAINER_LABEL] },
    });

    if (containers.length === 0) {
        console.log('\nℹ️  No RedisVL test container is currently running.');
        console.log('   Start one with: npm test\n');
        return;
    }

    const info = containers[0];
    const binding = info.Ports.find((p) => p.PrivatePort === REDIS_PORT);

    if (!binding?.PublicPort) {
        console.log(
            '\n⚠️  RedisVL test container is running but no host port is exposed for 6379.\n'
        );
        return;
    }

    const url = `redis://default@127.0.0.1:${binding.PublicPort}`;
    console.log(`\nInspect test data at ${url} using redis-cli or Redis Insight\n`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
