// React Native polyfills for Node.js modules
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// EventEmitter polyfill
import { EventEmitter } from 'events';

// Buffer polyfill
import { Buffer } from 'buffer';

// Process polyfill
import process from 'process';

// Global assignments for React Native
if (typeof global !== 'undefined') {
  // EventEmitter
  if (!global.EventEmitter) {
    global.EventEmitter = EventEmitter;
  }

  // Buffer
  if (!global.Buffer) {
    global.Buffer = Buffer;
  }

  // Process
  if (!global.process) {
    global.process = process;
  }

  // TextEncoder/TextDecoder for crypto operations
  if (typeof global.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('text-encoding');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
  }
}

export {};
