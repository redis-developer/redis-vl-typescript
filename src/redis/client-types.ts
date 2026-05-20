/**
 * Redis Client Type Definitions
 *
 * The bare `RedisClientType` / `RedisClusterType` aliases re-exported from
 * the `redis` package default their `RESP` generic to `2`. When consumers
 * call `createClient(...)` without an explicit annotation, TypeScript
 * infers `RESP` as the full `RespVersions` union (`2 | 3`), making the
 * inferred client unassignable to APIs typed against the bare alias.
 *
 * `AnyRedisClient` widens the public-facing client surface so any client
 * produced by `createClient` / `createCluster` is accepted regardless of
 * inferred RESP version, modules, functions, scripts, or type mapping.
 */

import type { RedisClientType, RedisClusterType } from 'redis';

/**
 * Public-facing union accepted by SearchIndex and storage constructors.
 *
 * The five generic parameters of `RedisClientType` / `RedisClusterType`
 * (modules, functions, scripts, RESP version, type mapping) behave
 * invariantly in @redis/client, so a bare `RedisClientType` cannot be
 * assigned to `RedisClientType<…, RespVersions, …>` and vice versa.
 * Filling each parameter with `any` is the standard idiom for "accept
 * any specialization of this generic" and is necessary here so callers
 * can pass either an inferred `createClient(...)` result or the bare
 * alias without compile-time friction. Internal call sites narrow the
 * value back to `RedisClientType | RedisClusterType` via a plain `as`
 * cast so this widening never leaks beyond the public surface.
 */
export type AnyRedisClient =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | RedisClientType<any, any, any, any, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | RedisClusterType<any, any, any, any, any>;
