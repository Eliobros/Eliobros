const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true // Isso vai mostrar o QR code no terminal
        });

        sock.ev.on('creds.update', saveCreds);

        // mensagens recebidas
        sock.ev.on('messages.upsert', ({ messages }) => {
            const msg = messages[0];
            if (msg.message) {
                console.log('Mensagem recebida:', msg);
                // Responde com a mensagem personalizada
                sock.sendMessage(msg.key.remoteJid, { text: 'Olá! Sou a Afri\'IA, a inteligência artificial criada pela MTevolution.' });
            }
        });

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('Conexão fechada devido a', lastDisconnect.error, 'Reconectar:', shouldReconnect);
                // Tenta reconectar se não for um logout
                if (shouldReconnect) {
                    connectToWhatsApp();
                }
            } else if (connection === 'open') {
                console.log('Conectado com sucesso');
            }
        });
    } catch (error) {
        console.error('Erro ao conectar ao WhatsApp:', error);
    }
}

connectToWhatsApp();
