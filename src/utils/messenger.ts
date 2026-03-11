import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GO_API_BASE = process.env.WHATSAPP_GO_URL;
const GOWA_AUTH = Buffer.from(process.env.WHATSAPP_GO_AUTH || "").toString('base64');

export interface MessagePayload {
    receiver: string;
    message: string;
}

export const sendToGoBridge = async (payload: MessagePayload) => {
    try {
        // Adjust the endpoint path based on the aldinokemal/go-whatsapp-web-multidevice docs
        // Usually /send-message or similar
        const response = await axios.post(`${GO_API_BASE}/send/message`, {
            phone: payload.receiver,
            message: payload.message,
        }, {
            headers: {
                'Authorization': `Basic ${GOWA_AUTH}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error: any) {
        console.error(`[Error] Failed to send to ${payload.receiver}:`, error.message);
        throw error;
    }
};