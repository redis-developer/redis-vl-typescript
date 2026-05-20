import { describe, it, expect } from 'vitest';
import { getProtocolVersion, assertSupportedProtocol } from '../../../src/redis/protocol.js';
import { RedisVLError } from '../../../src/errors.js';
import type { AnyRedisClient } from '../../../src/redis/client-types.js';

describe('getProtocolVersion', () => {
    it('returns 2 when standalone client.options.RESP is 2', () => {
        const client = { options: { RESP: 2 } } as unknown as AnyRedisClient;
        expect(getProtocolVersion(client)).toBe(2);
    });

    it('returns 3 when standalone client.options.RESP is 3', () => {
        const client = { options: { RESP: 3 } } as unknown as AnyRedisClient;
        expect(getProtocolVersion(client)).toBe(3);
    });

    it('returns 2 when standalone client.options.RESP is undefined', () => {
        const client = { options: {} } as unknown as AnyRedisClient;
        expect(getProtocolVersion(client)).toBe(2);
    });

    it('returns 2 when standalone client has no options at all', () => {
        const client = {} as unknown as AnyRedisClient;
        expect(getProtocolVersion(client)).toBe(2);
    });

    it('returns 3 when cluster client._options.RESP is 3', () => {
        const client = { _options: { RESP: 3 } } as unknown as AnyRedisClient;
        expect(getProtocolVersion(client)).toBe(3);
    });

    it('returns 2 when cluster client._options.RESP is 2', () => {
        const client = { _options: { RESP: 2 } } as unknown as AnyRedisClient;
        expect(getProtocolVersion(client)).toBe(2);
    });

    it('returns 2 when cluster client._options.RESP is undefined', () => {
        const client = { _options: {} } as unknown as AnyRedisClient;
        expect(getProtocolVersion(client)).toBe(2);
    });

    it('prefers standalone options over cluster _options when both exist', () => {
        const client = {
            options: { RESP: 2 },
            _options: { RESP: 3 },
        } as unknown as AnyRedisClient;
        expect(getProtocolVersion(client)).toBe(2);
    });
});

describe('assertSupportedProtocol', () => {
    it('does not throw for RESP=2 standalone client', () => {
        const client = { options: { RESP: 2 } } as unknown as AnyRedisClient;
        expect(() => assertSupportedProtocol(client)).not.toThrow();
    });

    it('does not throw when RESP is unset (defaults to 2)', () => {
        const client = { options: {} } as unknown as AnyRedisClient;
        expect(() => assertSupportedProtocol(client)).not.toThrow();
    });

    it('does not throw for RESP=2 cluster client', () => {
        const client = { _options: { RESP: 2 } } as unknown as AnyRedisClient;
        expect(() => assertSupportedProtocol(client)).not.toThrow();
    });

    it('throws RedisVLError for RESP=3 standalone client', () => {
        const client = { options: { RESP: 3 } } as unknown as AnyRedisClient;
        expect(() => assertSupportedProtocol(client)).toThrow(RedisVLError);
    });

    it('throws RedisVLError for RESP=3 cluster client', () => {
        const client = { _options: { RESP: 3 } } as unknown as AnyRedisClient;
        expect(() => assertSupportedProtocol(client)).toThrow(RedisVLError);
    });

    it('error message names the upstream @redis/search unstableResp3 constraint', () => {
        const client = { options: { RESP: 3 } } as unknown as AnyRedisClient;
        expect(() => assertSupportedProtocol(client)).toThrow(/RESP=3/);
        expect(() => assertSupportedProtocol(client)).toThrow(/unstableResp3|@redis\/search/);
    });
});
