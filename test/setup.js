import { TextEncoder, TextDecoder } from 'util';
import { MessageChannel } from 'worker_threads';

Object.assign(global, { MessageChannel, TextDecoder, TextEncoder });
