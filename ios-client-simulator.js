/**
 * Simulador de Cliente iOS - Tori Claud
 *
 * Este script simula una conexión de iPhone al servidor
 * Envía datos reales de sincronización cada 2 segundos
 */

const io = require('socket.io-client');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const DEVICE_NAME = process.env.DEVICE_NAME || 'iPhone de Usuario';
const DEVICE_TYPE = 'ios';
const SYNC_INTERVAL = process.env.SYNC_INTERVAL || 2000;  // 2 segundos

// ═══════════════════════════════════════════════════════════════
// DATOS SIMULADOS
// ═══════════════════════════════════════════════════════════════

const simulatedData = {
    sessionID: crypto.randomUUID(),
    userID: 'user-' + crypto.randomBytes(4).toString('hex'),
    appState: {
        currentScreen: ['home', 'profile', 'settings', 'explore'][Math.floor(Math.random() * 4)],
        scrollPosition: Math.floor(Math.random() * 500),
        selectedItem: 'item-' + Math.floor(Math.random() * 100)
    },
    device: {
        model: 'iPhone 15 Pro',
        osVersion: '18.0',
        appVersion: '1.0.0'
    },
    connectivity: {
        wifi: true,
        signal: Math.floor(Math.random() * 5) + 1,
        isCharging: Math.random() > 0.5,
        batteryLevel: Math.floor(Math.random() * 30) + 70
    },
    sensors: {
        location: {
            latitude: -33.8688 + (Math.random() - 0.5) * 0.1,
            longitude: -151.2093 + (Math.random() - 0.5) * 0.1,
            accuracy: Math.floor(Math.random() * 50) + 5
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// CLIENTE SOCKET.IO
// ═══════════════════════════════════════════════════════════════

class iOSClient {
    constructor(serverUrl, deviceName) {
        this.serverUrl = serverUrl;
        this.deviceName = deviceName;
        this.socket = null;
        this.syncCount = 0;
        this.connectionTime = null;
        this.isConnected = false;
    }

    connect() {
        console.log('\n' + '═'.repeat(60));
        console.log('📱 CLIENTE iOS - CONECTANDO');
        console.log('═'.repeat(60));
        console.log(`🔗 Servidor: ${this.serverUrl}`);
        console.log(`📱 Dispositivo: ${this.deviceName}`);
        console.log('═'.repeat(60) + '\n');

        this.socket = io(this.serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        // ───────────────────────────────────────────────────────────
        // Evento: Conectado
        // ───────────────────────────────────────────────────────────
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.connectionTime = new Date();
            console.log(`✅ [${this.getTime()}] Conectado al servidor`);
            console.log(`📱 ID de sesión: ${this.socket.id.substring(0, 8)}`);

            // Registrar dispositivo
            this.socket.emit('registerDevice', {
                type: DEVICE_TYPE,
                name: this.deviceName,
                model: simulatedData.device.model,
                osVersion: simulatedData.device.osVersion
            });

            // Iniciar sincronización
            this.startSyncing();
        });

        // ───────────────────────────────────────────────────────────
        // Evento: Desconectado
        // ───────────────────────────────────────────────────────────
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log(`❌ [${this.getTime()}] Desconectado del servidor`);
        });

        // ───────────────────────────────────────────────────────────
        // Evento: Confirmación de recepción
        // ───────────────────────────────────────────────────────────
        this.socket.on('dataReceived', (response) => {
            if (response.success) {
                console.log(`✅ [${this.getTime()}] Datos confirmados por servidor`);
            }
        });

        // ───────────────────────────────────────────────────────────
        // Evento: Sincronización de datos
        // ───────────────────────────────────────────────────────────
        this.socket.on('syncData', (data) => {
            console.log(`🔄 [${this.getTime()}] Datos sincronizados desde ${data.source}`);
            if (data.source !== 'ios') {
                console.log(`   Origen: ${data.source}`);
                console.log(`   Datos:`, JSON.stringify(data.payload).substring(0, 60) + '...');
            }
        });

        // ───────────────────────────────────────────────────────────
        // Evento: Broadcast
        // ───────────────────────────────────────────────────────────
        this.socket.on('broadcast', (data) => {
            console.log(`📢 [${this.getTime()}] Broadcast: ${data.message}`);
        });

        // ───────────────────────────────────────────────────────────
        // Evento: Error
        // ───────────────────────────────────────────────────────────
        this.socket.on('error', (error) => {
            console.log(`⚠️ [${this.getTime()}] Error: ${error}`);
        });
    }

    startSyncing() {
        console.log(`🔄 Iniciando sincronización cada ${SYNC_INTERVAL / 1000}s\n`);

        setInterval(() => {
            if (this.isConnected) {
                this.syncData();
            }
        }, SYNC_INTERVAL);
    }

    syncData() {
        this.syncCount++;

        // Actualizar datos simulados
        const data = {
            ...simulatedData,
            timestamp: new Date().toISOString(),
            syncCount: this.syncCount,
            appState: {
                ...simulatedData.appState,
                currentScreen: ['home', 'profile', 'settings', 'explore'][Math.floor(Math.random() * 4)],
                scrollPosition: Math.floor(Math.random() * 500)
            },
            connectivity: {
                ...simulatedData.connectivity,
                signal: Math.floor(Math.random() * 5) + 1,
                batteryLevel: simulatedData.connectivity.batteryLevel - (Math.random() * 2)
            }
        };

        // Enviar al servidor
        this.socket.emit('mobileData', data);

        // Log
        console.log(`📤 [${this.getTime()}] Sync #${this.syncCount} enviado`);
        console.log(`   Pantalla: ${data.appState.currentScreen}`);
        console.log(`   Batería: ${Math.floor(data.connectivity.batteryLevel)}%`);
        console.log(`   Signal: ${'📶'.repeat(data.connectivity.signal)}`);
        console.log('');
    }

    getTime() {
        return new Date().toLocaleTimeString('es-ES');
    }

    getStats() {
        const uptime = this.isConnected
            ? Math.floor((Date.now() - this.connectionTime) / 1000)
            : 0;

        return {
            isConnected: this.isConnected,
            syncCount: this.syncCount,
            uptime: uptime,
            connectionTime: this.connectionTime
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.log('\n❌ Cliente iOS desconectado');
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// EJECUTAR CLIENTE
// ═══════════════════════════════════════════════════════════════

const client = new iOSClient(SERVER_URL, DEVICE_NAME);
client.connect();

// Mostrar estadísticas cada 30 segundos
setInterval(() => {
    if (client.isConnected) {
        const stats = client.getStats();
        console.log('\n' + '─'.repeat(60));
        console.log('📊 ESTADÍSTICAS DEL CLIENTE iOS');
        console.log('─'.repeat(60));
        console.log(`✅ Conectado: ${stats.isConnected ? 'SÍ' : 'NO'}`);
        console.log(`📤 Sincronizaciones: ${stats.syncCount}`);
        console.log(`⏱️ Tiempo conectado: ${stats.uptime}s`);
        console.log('─'.repeat(60) + '\n');
    }
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Deteniendo cliente iOS...');
    client.disconnect();
    process.exit(0);
});

module.exports = client;
