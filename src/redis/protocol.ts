/**
 * Runtime detection of the active RESP protocol version on a node-redis
 * client or cluster, plus a guard that rejects RESP=3 with an explicit
 * error.
 *
 * `@redis/search` does not yet ship stable RESP3 reply transformers for
 * FT.* commands — every command is published with `unstableResp3: true`
 * and `transformReply.3 = undefined`, meaning node-redis explicitly
 * does not parse RESP3 replies for the search module. Until that
 * changes upstream, RedisVL refuses RESP=3 clients at construction
 * time rather than letting them fail later with confusing reply-shape
 * errors.
 *
 * Last verified upstream: `@redis/search` 5.12.1 (transitive of the
 * pinned `redis` dependency). Revisit when upstream stabilizes RESP3
 * reply parsing for the search module; at that point this guard
 * should be removed.
 */

import type { RespVersions } from 'redis';
import type { AnyRedisClient } from './client-types.js';
import { RedisVLError } from '../errors.js';

/**
 * Read the active RESP protocol version from a node-redis client or
 * cluster. Returns `2` when not explicitly set, mirroring node-redis's
 * own default.
 */
export function getProtocolVersion(client: AnyRedisClient): RespVersions {
    const standalone = (client as { options?: { RESP?: unknown } }).options;
    const cluster = (client as { _options?: { RESP?: unknown } })._options;
    const resp = standalone?.RESP ?? cluster?.RESP;
    return resp === 3 ? 3 : 2;
}

/**
 * Throw a `RedisVLError` if the supplied client is configured for
 * RESP=3. RedisVL only supports RESP=2 today; see the module-level
 * comment for the upstream `@redis/search` constraint that drives
 * this restriction.
 */
export function assertSupportedProtocol(client: AnyRedisClient): void {
    if (getProtocolVersion(client) === 3) {
        throw new RedisVLError(
            'RedisVL does not support RESP=3 clients yet. ' +
                '`@redis/search` does not yet ship stable RESP3 reply transformers ' +
                'for FT.* commands, so index introspection and search results would ' +
                'have undefined shape. ' +
                'Use the default `RESP=2` (omit the option, or set `RESP: 2` explicitly) ' +
                'when calling `createClient` / `createCluster`.'
        );
    }
}
