const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

let connectedDevices = {};
let sessionData = {};

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

function logEvent(emoji, message) {
    const timestamp = new Date().toLocaleTimeString('es-ES');
    console.log(`[${timestamp}] ${emoji} ${message}`);
}

// ═══════════════════════════════════════════════════════════════
// SOCKET.IO EVENTS
// ═══════════════════════════════════════════════════════════════

io.on('connection', (socket) => {
    const deviceId = socket.id.substring(0, 8);
    logEvent('✅', `Nuevo dispositivo conectado: ${deviceId}`);

    connectedDevices[socket.id] = {
        id: socket.id,
        connectedAt: new Date(),
        deviceType: 'unknown',
        lastActivity: new Date()
    };

    // Enviar lista de dispositivos conectados
    io.emit('devicesList', {
        count: Object.keys(connectedDevices).length,
        devices: connectedDevices
    });

    // ───────────────────────────────────────────────────────────
    // Evento: Datos del móvil iOS
    // ───────────────────────────────────────────────────────────
    socket.on('mobileData', (data) => {
        logEvent('📱', `Datos iOS (${deviceId}): ${JSON.stringify(data).substring(0, 50)}...`);

        // Actualizar timestamp
        connectedDevices[socket.id].lastActivity = new Date();

        // Guardar datos de sesión
        sessionData[socket.id] = {
            ...data,
            source: 'ios',
            receivedAt: new Date()
        };

        // Sincronizar con otros dispositivos
        socket.broadcast.emit('syncData', {
            source: 'ios',
            deviceId: deviceId,
            payload: data,
            timestamp: new Date().toISOString()
        });

        // Confirmar recepción
        socket.emit('dataReceived', { success: true });
    });

    // ───────────────────────────────────────────────────────────
    // Evento: Datos desde PC
    // ───────────────────────────────────────────────────────────
    socket.on('pcData', (data) => {
        logEvent('💻', `Datos PC (${deviceId}): ${JSON.stringify(data).substring(0, 50)}...`);

        connectedDevices[socket.id].lastActivity = new Date();
        sessionData[socket.id] = {
            ...data,
            source: 'pc',
            receivedAt: new Date()
        };

        // Broadcast a todos
        io.emit('syncData', {
            source: 'pc',
            deviceId: deviceId,
            payload: data,
            timestamp: new Date().toISOString()
        });

        socket.emit('dataReceived', { success: true });
    });

    // ───────────────────────────────────────────────────────────
    // Evento: Registrar tipo de dispositivo
    // ───────────────────────────────────────────────────────────
    socket.on('registerDevice', (info) => {
        logEvent('🏷️', `Dispositivo registrado (${deviceId}): ${info.type} - ${info.name}`);
        connectedDevices[socket.id].deviceType = info.type;
        connectedDevices[socket.id].deviceName = info.name;

        io.emit('devicesList', {
            count: Object.keys(connectedDevices).length,
            devices: connectedDevices
        });
    });

    // ───────────────────────────────────────────────────────────
    // Evento: Ping/Heartbeat
    // ───────────────────────────────────────────────────────────
    socket.on('ping', () => {
        connectedDevices[socket.id].lastActivity = new Date();
        socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // ───────────────────────────────────────────────────────────
    // Evento: Desconexión
    // ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        logEvent('❌', `Dispositivo desconectado: ${deviceId}`);
        delete connectedDevices[socket.id];
        delete sessionData[socket.id];

        io.emit('devicesList', {
            count: Object.keys(connectedDevices).length,
            devices: connectedDevices
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// REST API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// GET /status - Estado general del servidor
app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        serverIP: getLocalIP(),
        port: 3000,
        timestamp: new Date().toISOString(),
        connectedCount: Object.keys(connectedDevices).length,
        devices: Object.values(connectedDevices).map(d => ({
            id: d.id,
            type: d.deviceType,
            name: d.deviceName || 'Unknown',
            connectedAt: d.connectedAt,
            lastActivity: d.lastActivity
        }))
    });
});

// POST /sync - Enviar datos a todos
app.post('/sync', (req, res) => {
    const { data } = req.body;
    logEvent('🔄', `Sync global recibido: ${JSON.stringify(data).substring(0, 50)}...`);

    io.emit('syncData', {
        source: 'api',
        payload: data,
        timestamp: new Date().toISOString()
    });

    res.json({ success: true, broadcast: Object.keys(connectedDevices).length });
});

// GET /devices - Lista de dispositivos conectados
app.get('/devices', (req, res) => {
    res.json({
        count: Object.keys(connectedDevices).length,
        devices: Object.values(connectedDevices)
    });
});

// GET /sessions - Datos de las sesiones
app.get('/sessions', (req, res) => {
    res.json({
        count: Object.keys(sessionData).length,
        sessions: sessionData
    });
});

// POST /broadcast - Broadcast de mensaje
app.post('/broadcast', (req, res) => {
    const { message } = req.body;
    io.emit('broadcast', {
        message: message,
        timestamp: new Date().toISOString()
    });

    res.json({ success: true, recipients: Object.keys(connectedDevices).length });
});

// ═══════════════════════════════════════════════════════════════
// INICIO DEL SERVIDOR
// ═══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    console.log('\n' + '═'.repeat(60));
    console.log('🚀 SERVIDOR TORI CLAUD INICIADO');
    console.log('═'.repeat(60));
    console.log(`📍 IP Local: ${localIP}`);
    console.log(`🌐 URL: http://${localIP}:${PORT}`);
    console.log(`📱 Usa esta IP en tu iPhone: ${localIP}`);
    console.log('═'.repeat(60) + '\n');
});

// Manejo de errores
process.on('unhandledRejection', (reason, promise) => {
    logEvent('⚠️', `Error no manejado: ${reason}`);
});

// Exportar para testing
module.exports = { app, server, io };
