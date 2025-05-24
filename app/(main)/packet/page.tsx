'use client';

import { useState, useEffect } from 'react';
import { createPacket, serializePacket, deserializePacket, WasmPacket, PacketKind } from '@/oop/packet';

export default function PacketPage() {
    const [prebuiltBinary, setPrebuiltBinary] = useState<string>('');
    const [customPacket, setCustomPacket] = useState<WasmPacket | null>(null);
    const [customBinary, setCustomBinary] = useState<string>('');

    // Form state
    const [selectedKind, setSelectedKind] = useState<PacketKind>(PacketKind.Message);
    const [payloadText, setPayloadText] = useState('Hello, WASM!');

    useEffect(() => {
        const init = async () => {
            try {

                // Create a pre-built packet
                const textEncoder = new TextEncoder();
                const payload = textEncoder.encode('This is a pre-built message packet!');
                const packet = createPacket(PacketKind.Message, payload);

                // Serialize and display binary
                const binary = serializePacket(packet);
                setPrebuiltBinary(arrayToHexString(binary));
            } catch (error) {
                console.error('Failed to initialize WASM:', error);
            }
        };

        init();
    }, []);

    const arrayToHexString = (array: Uint8Array): string => {
        return Array.from(array)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join(' ');
    };

    const createCustomPacket = () => {
        try {
            const textEncoder = new TextEncoder();
            const payload = textEncoder.encode(payloadText);
            const packet = createPacket(selectedKind, payload);
            setCustomPacket(packet);

            // Serialize and display binary
            const binary = serializePacket(packet);
            setCustomBinary(arrayToHexString(binary));
        } catch (error) {
            console.error('Failed to create packet:', error);
        }
    };

    const testDeserialization = (binaryStr: string, isPrebuilt: boolean) => {
        try {
            // Convert hex string back to Uint8Array
            const hexArray = binaryStr.split(' ').filter(hex => hex.length === 2);
            const bytes = new Uint8Array(hexArray.map(hex => parseInt(hex, 16)));

            // Deserialize
            const deserializedPacket = deserializePacket(bytes);
            const kind = deserializedPacket.kind();
            const payload = deserializedPacket.payload();
            const textDecoder = new TextDecoder();
            const message = textDecoder.decode(payload);

            alert(`${isPrebuilt ? 'Pre-built' : 'Custom'} packet deserialized successfully!\nKind: ${PacketKind[kind]}\nMessage: ${message}`);
        } catch (error) {
            console.error('Deserialization failed:', error);
            alert('Failed to deserialize packet');
        }
    };

    // ASCII Art Generator Functions
    const generateHorizontalLine = (length: number, char: string = '─') => char.repeat(length);

    const generateBox = (width: number, height: number, title?: string) => {
        const lines = [
            '',  // Add an empty line at the beginning
            '┌──────────────────────────────────────────────────────────────────────────┐',
            '│                  PACKET STRUCTURE (BINCODE SERIALIZED)                   │',
            '└──────────────────────────────────────────────────────────────────────────┘',
        ];
        return lines;
    };

    const generatePacketDiagram = () => {
        const width = 76;
        const lines = [];

        // Title box
        lines.push(...generateBox(width, 4, 'PACKET STRUCTURE (BINCODE SERIALIZED)'));
        lines.push('');

        // Byte positions header
        const positions = '  0    1    2    3    4    5    6    7    8    9   10   11   ...';
        lines.push(positions);

        // Field representations
        lines.push('┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬─────');
        lines.push('│ K  │ I  │ N  │ D  │ L  │ E  │ N  │... │ D  │ A  │ T  │ A  │ ... ');
        lines.push('└────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴─────');
        lines.push(' \\____________/ \\___________________/ \\________________________/');
        lines.push('      KIND           PAYLOAD LEN           COMPRESSED DATA        ');
        lines.push('   (1-8 bytes)       (variable)           (LZ4 compressed)       ');
        lines.push('');

        // CRC section
        lines.push('┌────┬────┬────┬────┐');
        lines.push('│ C  │ R  │ C  │ 32 │ <- CRC32 CHECKSUM (4 bytes)');
        lines.push('└────┴────┴────┴────┘');
        lines.push('');

        // Field descriptions
        lines.push('FIELD DESCRIPTIONS:');
        lines.push('┌──────────────────────────────────────────────────────────────────┐');
        lines.push('│ KIND: PacketKind enum (Message=0, Reaction=1)                    │');
        lines.push('│       Serialized using bincode variable-length encoding          │');
        lines.push('│                                                                  │');
        lines.push('│ PAYLOAD LEN: Vec<u8> length prefix (bincode varint)              │');
        lines.push('│              Can be 1-8 bytes depending on payload size          │');
        lines.push('│                                                                  │');
        lines.push('│ COMPRESSED DATA: LZ4 frame-compressed payload data               │');
        lines.push('│                 Original payload is compressed before storage    │');
        lines.push('│                 Decompressed on retrieval                       │');
        lines.push('│                                                                  │');
        lines.push('│ CRC32: 32-bit cyclic redundancy check for data integrity         │');
        lines.push('│        Calculated from compressed payload bytes                  │');
        lines.push('└──────────────────────────────────────────────────────────────────┘');
        lines.push('');

        // Technical details
        lines.push('SERIALIZATION FORMAT: BINCODE (Little-Endian, Compact)');
        lines.push('COMPRESSION: LZ4 Frame Format (High compression ratio, fast decompression)');
        lines.push('MINIMUM SIZE: ~6-12 bytes + compressed payload length');
        lines.push('MAXIMUM SIZE: Limited by Vec<u8> capacity (~18 exabytes)');

        return lines.join('\n');
    };

    const generateRustStructDiagram = () => {
        const lines = [
            'pub struct Packet {',
            '    pub kind: PacketKind,    // enum: Message(0) | Reaction(1)',
            '    pub payload: Vec<u8>,    // LZ4 compressed byte array',
            '    pub crc: u32,           // 32-bit CRC checksum',
            '}',
            '',
            '#[derive(Serialize, Deserialize, bincode::Encode, bincode::Decode)]',
            'pub enum PacketKind {',
            '    Message,   // 0x00',
            '    Reaction,  // 0x01',
            '}'
        ];
        return lines.join('\n');
    };

    return (
        <div className="min-h-screen bg-white text-black font-mono">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
                    PACKET PROTOCOL SHOWCASE
                </h1>

                {/* Info Section */}
                <div className="border border-gray-400 rounded-lg p-6 mt-8">
                    <h3 className="text-lg font-bold mb-2 text-gray-700 uppercase tracking-wider">
                        [PROTOCOL INFO]
                    </h3>
                    <ul className="text-gray-600 space-y-1 text-sm">
                        <li>• PACKETS ARE CREATED WITH A TYPE (MESSAGE/REACTION) AND PAYLOAD</li>
                        <li>• PAYLOAD IS COMPRESSED USING LZ4 FRAME COMPRESSION</li>
                        <li>• SERIALIZATION CONVERTS THE PACKET TO BINARY FORMAT USING BINCODE</li>
                        <li>• BINARY DATA IS DISPLAYED AS HEXADECIMAL FOR READABILITY</li>
                        <li>• DESERIALIZATION RECONSTRUCTS THE ORIGINAL PACKET FROM BINARY DATA</li>
                        <li>• ALL OPERATIONS HAPPEN IN WASM FOR PERFORMANCE</li>
                    </ul>
                </div>

                {/* Protocol Structure Visualization */}
                <div className="text-gray-400 border border-gray-400 rounded-lg p-6 my-8 font-mono">
                    <h3 className="text-lg font-bold mb-4 text-gray-400 uppercase tracking-wider">
                        [PACKET PROTOCOL STRUCTURE]
                    </h3>
                    <div className="text-sm space-y-2">
                        <div className="text-black mb-3">RUST STRUCT DEFINITION:</div>
                        <pre className="text-black mb-6 whitespace-pre-wrap">
                            {generateRustStructDiagram()}
                        </pre>

                        <div className="text-black mb-3">BINARY LAYOUT:</div>

                        {/* Programmatic ASCII Diagram */}            
                        <div className="p-4 rounded border border-gray-500 overflow-x-auto">              
                            <pre className="text-black text-xs leading-tight whitespace-pre"> 
                                {generatePacketDiagram()}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Pre-built Packet Section */}
                <div className="border border-gray-300 rounded-lg p-6 mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-gray-700">
                        [PRE-BUILT PACKET]
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wider">
                                PACKET TYPE:
                            </label>
                            <p className="text-black font-bold">MESSAGE</p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wider">
                                PAYLOAD:
                            </label>
                            <p className="text-black">"This is a pre-built message packet!"</p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wider">
                                BINARY REPRESENTATION:
                            </label>
                            <div className="bg-white border border-gray-400 p-3 rounded text-gray-700 text-sm break-all">
                                {prebuiltBinary}
                            </div>
                        </div>
                        <button
                            onClick={() => testDeserialization(prebuiltBinary, true)}
                            className="bg-black text-white hover:bg-gray-800 px-4 py-2 rounded font-bold transition-colors uppercase tracking-wider"
                        >
                            TEST DESERIALIZATION
                        </button>
                    </div>
                </div>

                {/* Custom Packet Builder Section */}
                <div className="border border-gray-300 rounded-lg p-6">
                    <h2 className="text-2xl font-bold mb-4 text-gray-700">
                        [BUILD YOUR OWN PACKET]
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wider">
                                PACKET TYPE:
                            </label>
                            <select
                                value={selectedKind}
                                onChange={(e) => setSelectedKind(Number(e.target.value) as PacketKind)}
                                className="w-full p-2 bg-white border border-gray-400 rounded text-black font-mono focus:ring-2 focus:ring-black focus:border-black"
                            >
                                <option value={PacketKind.Message}>MESSAGE</option>
                                <option value={PacketKind.Reaction}>REACTION</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wider">
                                PAYLOAD TEXT:
                            </label>
                            <input
                                type="text"
                                value={payloadText}
                                onChange={(e) => setPayloadText(e.target.value)}
                                className="w-full p-2 bg-white border border-gray-400 rounded text-black font-mono focus:ring-2 focus:ring-black focus:border-black"
                                placeholder="ENTER YOUR MESSAGE..."
                            />
                        </div>
                        <button
                            onClick={createCustomPacket}
                            className="bg-black text-white hover:bg-gray-600 px-4 py-2 rounded font-bold transition-colors uppercase tracking-wider"
                        >
                            CREATE PACKET
                        </button>

                        {customPacket && (
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wider">
                                        GENERATED BINARY:
                                    </label>
                                    <div className="bg-white border border-gray-400 p-3 rounded text-gray-700 text-sm break-all">
                                        {customBinary}
                                    </div>
                                </div>
                                <button
                                    onClick={() => testDeserialization(customBinary, false)}
                                    className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-2 rounded font-bold transition-colors uppercase tracking-wider"
                                >
                                    TEST DESERIALIZATION
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
