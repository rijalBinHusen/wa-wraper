import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GO_API_BASE = process.env.WHATSAPP_GO_URL;
const GOWA_USERNAME = process.env.GOWA_USERNAME || "";
const GOWA_PASSWORD = process.env.GOWA_PASSWORD || "";

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
                'Content-Type': 'application/json'
            },
            auth: {
                username: GOWA_USERNAME,
                password: GOWA_PASSWORD,
            }
        });
        return response.data;
    } catch (error: any) {
        console.error(`[Error] Failed to send to ${payload.receiver}:`, error.message);
        throw error;
    }
};