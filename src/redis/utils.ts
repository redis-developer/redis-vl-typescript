import { SchemaValidationError } from '../errors.js';
import { VectorDataType } from '../schema/types.js';

export type VectorDataTypeInput = VectorDataType | string | undefined;

const VALID_VECTOR_DATA_TYPES = new Set<string>(Object.values(VectorDataType));

export function normalizeVectorDataType(datatype: VectorDataTypeInput): VectorDataType {
    const normalized = String(datatype ?? VectorDataType.FLOAT32).toUpperCase();

    if (!VALID_VECTOR_DATA_TYPES.has(normalized)) {
        throw new SchemaValidationError(
            `Invalid vector datatype: ${datatype}. Supported datatypes are: ${Object.values(
                VectorDataType
            ).join(', ')}`
        );
    }

    return normalized as VectorDataType;
}

export function vectorElementByteLength(datatype: VectorDataTypeInput): number {
    switch (normalizeVectorDataType(datatype)) {
        case VectorDataType.FLOAT64:
            return 8;
        case VectorDataType.FLOAT16:
        case VectorDataType.BFLOAT16:
            return 2;
        case VectorDataType.INT8:
        case VectorDataType.UINT8:
            return 1;
        case VectorDataType.FLOAT32:
            return 4;
    }
}

export function encodeVectorBuffer(
    vector: readonly unknown[],
    datatype: VectorDataTypeInput = VectorDataType.FLOAT32
): Buffer {
    switch (normalizeVectorDataType(datatype)) {
        case VectorDataType.FLOAT64:
            return Buffer.from(new Float64Array(validateVectorValues(vector)).buffer);
        case VectorDataType.FLOAT16:
            return encodeFloat16Buffer(validateVectorValues(vector));
        case VectorDataType.BFLOAT16:
            return encodeBFloat16Buffer(validateVectorValues(vector));
        case VectorDataType.INT8:
            return Buffer.from(
                Int8Array.from(validateIntegerVector(vector, -128, 127, VectorDataType.INT8)).buffer
            );
        case VectorDataType.UINT8:
            return Buffer.from(
                Uint8Array.from(validateIntegerVector(vector, 0, 255, VectorDataType.UINT8)).buffer
            );
        case VectorDataType.FLOAT32:
            return Buffer.from(new Float32Array(validateVectorValues(vector)).buffer);
    }
}

export function decodeVectorBuffer(
    buffer: Buffer,
    datatype: VectorDataTypeInput = VectorDataType.FLOAT32
): number[] {
    const normalizedDatatype = normalizeVectorDataType(datatype);
    const elementSize = vectorElementByteLength(normalizedDatatype);

    if (buffer.byteLength % elementSize !== 0) {
        throw new SchemaValidationError(
            `Vector buffer byte length (${buffer.byteLength}) is not a multiple of the ${normalizedDatatype} element size (${elementSize} bytes)`
        );
    }

    switch (normalizedDatatype) {
        case VectorDataType.FLOAT64:
            return decodeFloat64Buffer(buffer);
        case VectorDataType.FLOAT16:
            return decodeFloat16Buffer(buffer);
        case VectorDataType.BFLOAT16:
            return decodeBFloat16Buffer(buffer);
        case VectorDataType.INT8:
            return Array.from(new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
        case VectorDataType.UINT8:
            return Array.from(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
        case VectorDataType.FLOAT32:
            return decodeFloat32Buffer(buffer);
    }
}

function validateVectorValues(vector: readonly unknown[]): number[] {
    return vector.map((value, index) => {
        assertFiniteNumber(value, index);
        return value as number;
    });
}

function validateIntegerVector(
    vector: readonly unknown[],
    min: number,
    max: number,
    datatype: VectorDataType
): number[] {
    return vector.map((value, index) => {
        assertFiniteNumber(value, index);

        const numericValue = value as number;

        if (!Number.isInteger(numericValue) || numericValue < min || numericValue > max) {
            throw new SchemaValidationError(
                `Vector value at index ${index} (${numericValue}) is outside the ${datatype} range (${min} to ${max})`
            );
        }

        return numericValue;
    });
}

function assertFiniteNumber(value: unknown, index: number): void {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        const reported = Number.isNaN(value) ? 'NaN' : typeof value;
        throw new SchemaValidationError(
            `Vector contains non-numeric value at index ${index}: ${reported}`
        );
    }
}

function decodeFloat32Buffer(buffer: Buffer): number[] {
    const values: number[] = [];

    for (let offset = 0; offset + 4 <= buffer.byteLength; offset += 4) {
        values.push(buffer.readFloatLE(offset));
    }

    return values;
}

function decodeFloat64Buffer(buffer: Buffer): number[] {
    const values: number[] = [];

    for (let offset = 0; offset + 8 <= buffer.byteLength; offset += 8) {
        values.push(buffer.readDoubleLE(offset));
    }

    return values;
}

// Float16 (IEEE 754 binary16) encode/decode implemented manually on top of
// DataView. The standard `Float16Array` and `DataView#getFloat16` both
// landed in V8 13.0 — Node 23+ — so we can't rely on them while we support
// Node 22 LTS. The BFloat16 path uses the same DataView-based approach.

function encodeFloat16Buffer(values: readonly number[]): Buffer {
    const buffer = Buffer.alloc(values.length * 2);
    for (let i = 0; i < values.length; i++) {
        buffer.writeUInt16LE(encodeFloat16(values[i]), i * 2);
    }
    return buffer;
}

function decodeFloat16Buffer(buffer: Buffer): number[] {
    const values: number[] = [];
    for (let offset = 0; offset + 2 <= buffer.byteLength; offset += 2) {
        values.push(decodeFloat16(buffer.readUInt16LE(offset)));
    }
    return values;
}

// Float16 layout: 1 sign | 5 exponent (bias 15) | 10 mantissa.
// Bridges through float32's bit pattern to preserve IEEE 754 semantics,
// then rounds to nearest with ties-to-even — matching `Float16Array` so a
// round-trip through this code produces identical bits on Node 22 vs 24+.
function encodeFloat16(value: number): number {
    const dataView = new DataView(new ArrayBuffer(4));
    dataView.setFloat32(0, value);
    const x = dataView.getUint32(0);

    const sign = (x >>> 16) & 0x8000;
    const exp32 = (x >>> 23) & 0xff;
    const mant32 = x & 0x7fffff;

    // NaN / Infinity (exp32 all-ones)
    if (exp32 === 0xff) {
        if (mant32 !== 0) {
            // NaN — keep at least one mantissa bit set so it stays a NaN.
            return sign | 0x7c00 | (mant32 >>> 13) | 0x200;
        }
        return sign | 0x7c00; // signed Infinity
    }

    const unbiased = exp32 - 127;

    // Overflow → signed Infinity.
    if (unbiased >= 16) return sign | 0x7c00;
    // Underflow past the smallest subnormal → signed zero.
    if (unbiased < -24) return sign;

    // Subnormal range: unbiased in [-24, -15].
    if (unbiased < -14) {
        const fullMant = mant32 | 0x800000; // restore the implicit leading 1
        const shiftBy = -1 - unbiased; // 14..23
        const half = 1 << (shiftBy - 1);
        const low = fullMant & ((1 << shiftBy) - 1);
        let mant16 = fullMant >>> shiftBy;
        if (low > half || (low === half && (mant16 & 1) !== 0)) {
            mant16++;
            // Subnormal mantissa rolled into the smallest normal value.
            if (mant16 === 0x400) return sign | 0x0400;
        }
        return sign | mant16;
    }

    // Normal range: unbiased in [-14, 15].
    const exp16 = unbiased + 15;
    const halfBit = 1 << 12;
    const low = mant32 & 0x1fff;
    let mant16 = mant32 >>> 13;
    if (low > halfBit || (low === halfBit && (mant16 & 1) !== 0)) {
        mant16++;
        if (mant16 === 0x400) {
            // Mantissa rolled over — bump the exponent and possibly overflow to Inf.
            const newExp = exp16 + 1;
            if (newExp >= 31) return sign | 0x7c00;
            return sign | (newExp << 10);
        }
    }
    return sign | (exp16 << 10) | mant16;
}

function decodeFloat16(bits: number): number {
    const sign = (bits >>> 15) & 1;
    const exp = (bits >>> 10) & 0x1f;
    const mantissa = bits & 0x3ff;

    let abs: number;
    if (exp === 0x1f) {
        // NaN or Infinity
        abs = mantissa === 0 ? Infinity : NaN;
    } else if (exp === 0) {
        // Zero or subnormal: value = mantissa × 2^-24
        abs = mantissa === 0 ? 0 : mantissa * Math.pow(2, -24);
    } else {
        // Normal: value = (1 + mantissa/2^10) × 2^(exp - 15)
        //              = (1024 + mantissa) × 2^(exp - 25)
        abs = (1024 + mantissa) * Math.pow(2, exp - 25);
    }
    return sign ? -abs : abs;
}

function encodeBFloat16Buffer(values: readonly number[]): Buffer {
    const buffer = Buffer.alloc(values.length * 2);

    values.forEach((value, index) => {
        buffer.writeUInt16LE(encodeBFloat16(value), index * 2);
    });

    return buffer;
}

function decodeBFloat16Buffer(buffer: Buffer): number[] {
    const values: number[] = [];

    for (let offset = 0; offset + 2 <= buffer.byteLength; offset += 2) {
        values.push(decodeBFloat16(buffer.readUInt16LE(offset)));
    }

    return values;
}

// Round-half-to-even; matches numpy (ml_dtypes.bfloat16) at exact boundaries.
function encodeBFloat16(value: number): number {
    const dataView = new DataView(new ArrayBuffer(4));
    dataView.setFloat32(0, value, false);
    const bits = dataView.getUint32(0, false);
    const leastSignificantBit = (bits >> 16) & 1;
    return (bits + 0x7fff + leastSignificantBit) >>> 16;
}

function decodeBFloat16(bits: number): number {
    const dataView = new DataView(new ArrayBuffer(4));
    dataView.setUint32(0, bits << 16, false);
    return dataView.getFloat32(0, false);
}
