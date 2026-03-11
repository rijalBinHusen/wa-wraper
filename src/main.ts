import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { sendToGoBridge, MessagePayload } from './utils/messenger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const INTERVAL = parseInt(process.env.SEND_INTERVAL_MS || '5000');

app.use(express.json());

// --- State Management ---
const messageQueue: MessagePayload[] = [];
let isWorkerRunning = false;

// --- Worker Logic ---
const processNextMessage = async () => {
    // 3. If queue is empty, stop the worker
    if (messageQueue.length === 0) {
        console.log('[Worker] Queue empty. Powering down...');
        isWorkerRunning = false;
        return;
    }

    const currentMessage = messageQueue.shift();
    
    if (currentMessage) {
        console.log(`[Worker] Sending to ${currentMessage.receiver}...`);
        try {
            await sendToGoBridge(currentMessage);
            console.log(`[Worker] Success for ${currentMessage.receiver}`);
        } catch (error) {
            console.error(`[Worker] Failed for ${currentMessage.receiver}`);
        }
    }

    // Schedule the next check after the interval
    setTimeout(processNextMessage, INTERVAL);
};

const startWorker = () => {
    // 2. If worker is already running, don't execute again
    if (isWorkerRunning) return;

    console.log('🚀 Worker initializing...');
    isWorkerRunning = true;
    processNextMessage();
};

// --- Routes ---
app.post('/add_message', (req: Request, res: Response) => {
    const { receiver, message } = req.body;

    if (!receiver || !message) {
        return res.status(400).json({ error: 'Missing receiver or message' });
    }

    messageQueue.push({ receiver, message });
    console.log(`[Queue] Added message. Total: ${messageQueue.length}`);

    // 1. Start worker on request
    startWorker();

    res.json({
        status: 'queued',
        workerActive: isWorkerRunning,
        queueLength: messageQueue.length
    });
});

// --- API Docs ---
// Use path.join to ensure it finds the yaml regardless of where the script runs
const swaggerPath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, './swagger.yaml') 
    : path.join(__dirname, 'swagger.yaml');

const swaggerDocument = YAML.load(swaggerPath);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(PORT, () => {
    console.log(`✅ WhatsApp-Throtler running on http://localhost:${PORT}`);
});