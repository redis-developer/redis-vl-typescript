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
            return Buffer.from(new Float16Array(validateVectorValues(vector)).buffer);
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

// Float16Array requires its byte offset to be a multiple of 2. Buffers returned by
// node-redis are slices of the parser's RESP buffer, so byteOffset depends on the
// shape of the whole reply (field name lengths, ordering, etc.) and is not guaranteed
// to be aligned. Read via DataView to sidestep the constraint (matches BFLOAT16 path).
function decodeFloat16Buffer(buffer: Buffer): number[] {
    const values: number[] = [];
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    for (let offset = 0; offset + 2 <= buffer.byteLength; offset += 2) {
        values.push(view.getFloat16(offset, true));
    }

    return values;
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
