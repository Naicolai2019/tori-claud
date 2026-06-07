# Tori Claud - Guía de Conexión Móvil a PC

## 📱 Descripción General

Este proyecto permite sincronizar aplicaciones entre tu dispositivo iOS y sesiones de PC. Los datos se sincronizan localmente sin necesidad de un servidor central.

---

## 🚀 Pasos de Configuración Inicial

### Fase 1: Preparación del Entorno (Paso 1-3)

#### **Paso 1: Instalar Herramientas Necesarias**

**En tu Mac o PC:**
```bash
# Instalar Xcode Command Line Tools (Mac)
xcode-select --install

# Instalar Homebrew (Mac)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Node.js (para sincronización de datos)
brew install node

# Instalar Git
brew install git
```

**En Windows:**
- Descargar e instalar [Git for Windows](https://git-scm.com/)
- Descargar e instalar [Node.js LTS](https://nodejs.org/)
- Descargar e instalar [Visual Studio Code](https://code.visualstudio.com/)

#### **Paso 2: Configurar Red Local**

Asegúrate de que tu iOS y PC estén **en la misma red WiFi**:

```bash
# Verificar IP local en Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Verificar IP local en Windows
ipconfig

# Nota: Ambos dispositivos deben estar en el mismo rango de IP
# Ej: 192.168.x.x o 10.0.x.x
```

#### **Paso 3: Instalar Dependencias del Proyecto**

```bash
# Clona o navega a tu proyecto
cd /home/user/tori-claud

# Instala las dependencias
npm install

# Instala dependencias de sincronización
npm install socket.io socket.io-client express cors
```

---

### Fase 2: Configurar la Aplicación iOS (Paso 4-7)

#### **Paso 4: Crear Proyecto en Xcode**

```bash
# Crear workspace de iOS
xcode-select --install
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

En Xcode:
1. File → New → Project
2. Selecciona "App"
3. Elige Swift como lenguaje
4. Nombre: `ToriClaud` (o tu nombre preferido)

#### **Paso 5: Instalar Librerías de Sincronización para iOS**

En tu proyecto Xcode, agrega las siguientes dependencias:

```swift
// En Podfile (si usas CocoaPods)
pod 'Socket.IO-Client-Swift'
pod 'Alamofire'
```

O con SPM (Swift Package Manager):
```
File → Add Packages
https://github.com/socketio/socket.io-client-swift.git
```

#### **Paso 6: Configurar Permisos en iOS**

En `Info.plist`, agrega:

```xml
<key>NSLocalNetworkUsageDescription</key>
<string>Esta app necesita acceso a la red local para sincronizar con tu PC</string>

<key>NSBonjourServices</key>
<array>
    <string>_toriclaud._tcp</string>
    <string>_toriclaud._udp</string>
</array>

<key>NSPrivateWiFiUsageReason</key>
<string>Sincronización local con dispositivos</string>
```

#### **Paso 7: Código Base para iOS**

Crea un archivo `ConnectionManager.swift`:

```swift
import Foundation
import SocketIO

class ConnectionManager: NSObject, ObservableObject {
    @Published var isConnected = false
    @Published var sessionData: [String: Any] = [:]
    
    var manager: SocketManager?
    var socket: SocketIOClient?
    
    func connectToPC(ipAddress: String, port: UInt16 = 3000) {
        let url = URL(string: "http://\(ipAddress):\(port)")!
        
        manager = SocketManager(socketURL: url, config: [
            .log(true),
            .compress
        ])
        
        socket = manager?.defaultSocket
        
        socket?.on(clientEvent: .connect) { _, _ in
            DispatchQueue.main.async {
                self.isConnected = true
                print("✅ Conectado al PC")
            }
        }
        
        socket?.on("syncData") { data, _ in
            DispatchQueue.main.async {
                if let dict = data[0] as? [String: Any] {
                    self.sessionData = dict
                    print("📱 Datos sincronizados: \(dict)")
                }
            }
        }
        
        socket?.on(clientEvent: .disconnect) { _, _ in
            DispatchQueue.main.async {
                self.isConnected = false
                print("❌ Desconectado del PC")
            }
        }
        
        socket?.connect()
    }
    
    func sendDataToPC(_ data: [String: Any]) {
        socket?.emit("mobileData", data)
    }
    
    func disconnect() {
        socket?.disconnect()
    }
}
```

---

### Fase 3: Configurar Servidor en PC (Paso 8-10)

#### **Paso 8: Crear Servidor Node.js**

Crea archivo `server.js` en tu PC:

```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

let connectedDevices = {};
let sessionData = {};

// Obtener IP local
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

// Eventos de Socket.IO
io.on('connection', (socket) => {
    console.log('✅ Nuevo dispositivo conectado:', socket.id);
    
    connectedDevices[socket.id] = {
        id: socket.id,
        connectedAt: new Date(),
        deviceType: 'unknown'
    };
    
    // Recibir datos del móvil
    socket.on('mobileData', (data) => {
        console.log('📱 Datos recibidos del iOS:', data);
        sessionData[socket.id] = data;
        
        // Sincronizar con otros dispositivos
        socket.broadcast.emit('syncData', data);
    });
    
    // Recibir datos del PC
    socket.on('pcData', (data) => {
        console.log('💻 Datos desde PC:', data);
        sessionData[socket.id] = data;
        
        // Enviar al iOS
        io.emit('syncData', data);
    });
    
    // Desconexión
    socket.on('disconnect', () => {
        console.log('❌ Dispositivo desconectado:', socket.id);
        delete connectedDevices[socket.id];
        delete sessionData[socket.id];
    });
});

// API REST para obtener estado
app.get('/status', (req, res) => {
    res.json({
        connectedDevices: Object.keys(connectedDevices).length,
        devices: connectedDevices,
        sessionData: sessionData,
        serverIP: getLocalIP()
    });
});

// Endpoint para iniciar sincronización
app.post('/sync', (req, res) => {
    const { data } = req.body;
    io.emit('syncData', data);
    res.json({ success: true });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log(`\n🚀 Servidor corriendo en: http://${localIP}:${PORT}`);
    console.log(`📝 Usa esta IP en tu iPhone: ${localIP}\n`);
});
```

#### **Paso 9: Iniciar el Servidor**

```bash
# En tu carpeta del proyecto en PC
node server.js

# Salida esperada:
# 🚀 Servidor corriendo en: http://192.168.1.100:3000
# 📝 Usa esta IP en tu iPhone: 192.168.1.100
```

#### **Paso 10: Crear Cliente Web en PC**

Crea archivo `index.html` en la carpeta del servidor:

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tori Claud - Control Panel</title>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .devices-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .device-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .device-card.connected { border-left: 4px solid #4caf50; }
        .device-card.disconnected { border-left: 4px solid #f44336; }
        .status { font-size: 12px; margin-top: 10px; }
        .status.online { color: #4caf50; }
        .status.offline { color: #f44336; }
        input, button { padding: 10px; margin: 5px; border: none; border-radius: 5px; }
        button { background: #667eea; color: white; cursor: pointer; font-weight: bold; }
        button:hover { background: #764ba2; }
        .data-display { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 10px; font-size: 12px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🌐 Tori Claud - Centro de Control</h1>
            <p id="serverIP">Conectando...</p>
        </header>
        
        <div class="devices-grid" id="devicesContainer"></div>
        
        <div style="margin-top: 30px; background: white; padding: 20px; border-radius: 10px;">
            <h2>📤 Enviar Datos Globales</h2>
            <textarea id="dataInput" placeholder='{"acción": "sync", "datos": "..."}' style="width: 100%; height: 100px;"></textarea>
            <button onclick="sendGlobalData()">Enviar a Todos</button>
        </div>
    </div>

    <script>
        const socket = io();
        const devices = {};

        socket.on('connect', () => {
            console.log('✅ Conectado al servidor');
            updateServerIP();
        });

        socket.on('disconnect', () => {
            console.log('❌ Desconectado del servidor');
        });

        socket.on('mobileData', (data) => {
            console.log('📱 Datos del móvil:', data);
            updateUI();
        });

        function updateServerIP() {
            fetch('/status')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('serverIP').textContent = 
                        `📍 IP Servidor: ${data.serverIP}:3000 | 📱 Conectados: ${data.connectedDevices}`;
                    renderDevices(data);
                });
        }

        function renderDevices(data) {
            const container = document.getElementById('devicesContainer');
            container.innerHTML = '';
            
            data.devices.forEach(device => {
                const html = `
                    <div class="device-card connected">
                        <h3>📱 Dispositivo</h3>
                        <p><strong>ID:</strong> ${device.id.substring(0, 8)}</p>
                        <p><strong>Tipo:</strong> ${device.deviceType}</p>
                        <div class="status online">● En línea</div>
                    </div>
                `;
                container.innerHTML += html;
            });
        }

        function sendGlobalData() {
            const input = document.getElementById('dataInput');
            try {
                const data = JSON.parse(input.value);
                socket.emit('pcData', data);
                alert('✅ Datos enviados');
                input.value = '';
            } catch (e) {
                alert('❌ JSON inválido');
            }
        }

        setInterval(updateServerIP, 5000);
    </script>
</body>
</html>
```

Sirve con Express:
```javascript
// Agrega esto al server.js
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
```

---

### Fase 4: Conectar iOS a PC (Paso 11-13)

#### **Paso 11: Obtener IP del PC**

Cuando ejecutes `node server.js`, verás:
```
🚀 Servidor corriendo en: http://192.168.1.100:3000
📝 Usa esta IP en tu iPhone: 192.168.1.100
```

**Guarda esta IP (192.168.1.100 es un ejemplo)**

#### **Paso 12: Conectar desde iOS**

En tu app iOS, usa una pantalla de conexión:

```swift
import SwiftUI

struct ContentView: View {
    @ObservedObject var connection = ConnectionManager()
    @State var ipAddress = ""
    
    var body: some View {
        VStack(spacing: 20) {
            if connection.isConnected {
                VStack {
                    Text("✅ Conectado")
                        .font(.title)
                        .foregroundColor(.green)
                    
                    VStack(alignment: .leading) {
                        ForEach(connection.sessionData.sorted(by: { $0.key < $1.key }), id: \.key) { key, value in
                            Text("\(key): \(String(describing: value))")
                                .font(.caption)
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
                    
                    Button("Desconectar") {
                        connection.disconnect()
                    }
                    .foregroundColor(.red)
                }
            } else {
                VStack(spacing: 15) {
                    Text("🌐 Conectar a PC")
                        .font(.title2)
                    
                    TextField("IP del PC (ej: 192.168.1.100)", text: $ipAddress)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .keyboardType(.decimalPad)
                    
                    Button(action: {
                        if !ipAddress.isEmpty {
                            connection.connectToPC(ipAddress: ipAddress)
                        }
                    }) {
                        Text("Conectar")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                }
                .padding()
            }
        }
        .padding()
    }
}
```

#### **Paso 13: Verificar Conexión**

1. **En tu PC**, abre el navegador: `http://localhost:3000`
2. **En tu iPhone**:
   - Abre tu app
   - Ingresa la IP del PC
   - Presiona "Conectar"
3. **Verifica en el servidor**:
   - Deberías ver `✅ Nuevo dispositivo conectado`
   - El dashboard mostrará "📱 Conectados: 1"

---

## 🔐 Seguridad y Cifrado (Paso 14-15)

#### **Paso 14: Agregar Cifrado TLS**

```javascript
// server.js con HTTPS
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
};

// Para desarrollo local:
// openssl req -x509 -newkey rsa:4096 -nodes -out server.cert -keyout server.key -days 365

const server = https.createServer(options, app);
```

#### **Paso 15: Autenticación de Dispositivos**

```swift
// En iOS ConnectionManager.swift
func connectToPC(ipAddress: String, port: UInt16 = 3000, token: String? = nil) {
    let url = URL(string: "http://\(ipAddress):\(port)")!
    
    var config: [String: Any] = [
        .log(true),
        .compress
    ]
    
    if let token = token {
        config[.extraHeaders] = ["Authorization": "Bearer \(token)"]
    }
    
    manager = SocketManager(socketURL: url, config: config)
    // ... resto del código
}
```

---

## 📊 Sincronización en Tiempo Real

### Estructura de Datos Recomendada

```json
{
  "syncID": "uuid-aqui",
  "timestamp": 1234567890,
  "source": "ios",
  "action": "update",
  "data": {
    "sessionID": "user-123",
    "lastModified": "2025-06-07T10:00:00Z",
    "appState": {}
  }
}
```

### Manejo de Conflictos

```javascript
// En server.js
function mergeConflicts(newData, oldData) {
    // Última escritura gana (Last-Write-Wins)
    if (newData.timestamp > oldData.timestamp) {
        return newData;
    }
    return oldData;
}
```

---

## 🛠️ Troubleshooting

### Problema: iPhone no conecta
```bash
# 1. Verifica que estén en la misma red
ping 192.168.1.100  # (usa tu IP)

# 2. Verifica que el servidor esté corriendo
ps aux | grep node

# 3. Abre puerto en firewall
sudo lsof -i :3000
```

### Problema: Datos no sincronizan
```javascript
// Agrega logs en server.js
socket.on('mobileData', (data) => {
    console.log('📱 DEBUG:', JSON.stringify(data));
});
```

### Problema: Conexión lenta
- Asegúrate de usar WiFi 5GHz si disponible
- Reduce el tamaño de los datos enviados
- Aumenta el intervalo de sync

---

## 📱 Próximos Pasos

- [ ] Agregar soporte para Android
- [ ] Implementar cifrado end-to-end
- [ ] Crear gestor de múltiples sesiones
- [ ] Agregar sincronización en la nube
- [ ] Desarrollar app de escritorio (Electron)

---

## 📚 Referencias

- [Socket.IO Docs](https://socket.io/docs/)
- [Swift SocketIO Client](https://github.com/socketio/socket.io-client-swift)
- [Express.js Guide](https://expressjs.com/)

---

**¡Éxito con tu proyecto! 🚀**
