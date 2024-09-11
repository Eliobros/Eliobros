// Instale as bibliotecas necessárias: @google/generative-ai e baileys
const makeWASocket = require('@adiwajshing/baileys').default;
const { DisconnectReason } = require('@adiwajshing/baileys');
const { useMultiFileAuthState } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');

// Google Generative AI SDK
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY; // Use sua chave da API Gemini aqui
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: [{ codeExecution: {} }],
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

async function generateAIResponse(userInput) {
    const parts = [
        { text: `input: ${userInput}` }
    ];

    const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig,
    });

    return result.response.text(); // Retorna o texto gerado pela IA
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info'); // Estado de autenticação do WhatsApp

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Mostra o QR code no terminal
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('Conexão fechada. Não será reconectado.');
            }
        } else if (connection === 'open') {
            console.log('Conectado ao WhatsApp');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        console.log(JSON.stringify(m, undefined, 2));

        if (m.type === 'notify') {
            for (let msg of m.messages) {
                if (!msg.key.fromMe && msg.message?.conversation) {
                    const incomingMessage = msg.message.conversation;
                    console.log('Mensagem recebida: ', incomingMessage);

                    // Gerar resposta com IA
                    const aiResponse = await generateAIResponse(incomingMessage);
                    console.log('Resposta gerada pela IA: ', aiResponse);

                    // Enviar resposta de volta pelo WhatsApp
                    await sock.sendMessage(msg.key.remoteJid, { text: aiResponse });
                }
            }
        }
    });
}

connectToWhatsApp();
