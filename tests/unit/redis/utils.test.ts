import { describe, expect, it } from 'vitest';
import { SchemaValidationError } from '../../../src/errors.js';
import { VectorDataType } from '../../../src/schema/types.js';
import {
    decodeVectorBuffer,
    encodeVectorBuffer,
    normalizeVectorDataType,
} from '../../../src/redis/utils.js';

describe('vector buffer utilities', () => {
    describe('encodeVectorBuffer() and decodeVectorBuffer() round-trip', () => {
        it.each([
            {
                datatype: VectorDataType.FLOAT32,
                vector: [0.1, -0.2, 3.75],
                byteLength: 12,
            },
            {
                datatype: VectorDataType.FLOAT64,
                vector: [0.1, -0.2, 3.75],
                byteLength: 24,
            },
            {
                datatype: VectorDataType.FLOAT16,
                vector: [1, -2, 0.5],
                byteLength: 6,
            },
            {
                datatype: VectorDataType.BFLOAT16,
                vector: [1, -2, 0.5],
                byteLength: 6,
            },
            {
                datatype: VectorDataType.INT8,
                vector: [-128, 0, 127],
                byteLength: 3,
            },
            {
                datatype: VectorDataType.UINT8,
                vector: [0, 127, 255],
                byteLength: 3,
            },
        ])('should round-trip $datatype vectors', ({ datatype, vector, byteLength }) => {
            const buffer = encodeVectorBuffer(vector, datatype);
            const decoded = decodeVectorBuffer(buffer, datatype);

            expect(buffer.byteLength).toBe(byteLength);
            expect(decoded).toHaveLength(vector.length);

            for (let i = 0; i < vector.length; i++) {
                expect(decoded[i]).toBeCloseTo(vector[i], 6);
            }
        });

        it('should normalize lower-case datatype names from object and YAML schemas', () => {
            const buffer = encodeVectorBuffer([0.1, -0.2, 3.75], 'float64');
            const decoded = decodeVectorBuffer(buffer, 'float64');

            expect(buffer.byteLength).toBe(24);
            expect(decoded[0]).toBeCloseTo(0.1, 12);
            expect(decoded[1]).toBeCloseTo(-0.2, 12);
            expect(decoded[2]).toBeCloseTo(3.75, 12);
        });
    });

    describe('encodeVectorBuffer()', () => {
        it('should reject integer vector values outside the datatype range', () => {
            expect(() => encodeVectorBuffer([0, 256], VectorDataType.UINT8)).toThrow(
                SchemaValidationError
            );
            expect(() => encodeVectorBuffer([-129, 0], VectorDataType.INT8)).toThrow(
                SchemaValidationError
            );
        });

        it('should report NaN values distinctly from non-numeric types', () => {
            expect(() => encodeVectorBuffer([0.1, NaN, 0.3], VectorDataType.FLOAT32)).toThrow(
                /non-numeric value at index 1: NaN/
            );
            expect(() =>
                encodeVectorBuffer([0.1, 'oops' as unknown as number, 0.3], VectorDataType.FLOAT32)
            ).toThrow(/non-numeric value at index 1: string/);
        });
    });

    describe('decodeVectorBuffer()', () => {
        it('should reject buffers whose byte length is not a multiple of the element size', () => {
            expect(() => decodeVectorBuffer(Buffer.alloc(7), VectorDataType.FLOAT32)).toThrow(
                SchemaValidationError
            );
            expect(() => decodeVectorBuffer(Buffer.alloc(5), VectorDataType.FLOAT64)).toThrow(
                SchemaValidationError
            );
            expect(() => decodeVectorBuffer(Buffer.alloc(3), VectorDataType.FLOAT16)).toThrow(
                SchemaValidationError
            );
        });
    });

    describe('normalizeVectorDataType()', () => {
        it('should reject unknown datatype names', () => {
            expect(() => normalizeVectorDataType('garbage')).toThrow(SchemaValidationError);
            expect(() => normalizeVectorDataType('garbage')).toThrow(/Invalid vector datatype/);
        });
    });
});
