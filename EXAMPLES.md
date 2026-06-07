# 📚 Ejemplos de Uso y Flujos de Sincronización

## 📱 Ejemplo 1: Sincronizar Estado de Sesión

### Flujo: iPhone → Servidor → PC

```
iPhone                    Servidor                  PC
  │                          │                      │
  ├─ mobileData ────────────>│                      │
  │  {                        │                      │
  │   "sessionID": "user-1",  │                      │
  │   "appView": "home"       │ syncData broadcast  │
  │  }                        ├─────────────────────>│
  │                           │ Actualiza datos     │
  │<─ dataReceived ───────────┤                      │
  │  {success: true}          │                      │
```

### Código Swift para iPhone:

```swift
import SwiftUI

struct SyncExample: View {
    @ObservedObject var connection = ConnectionManager()
    
    var body: some View {
        Button("Sincronizar Estado") {
            let appState: [String: Any] = [
                "sessionID": UUID().uuidString,
                "appView": "home",
                "timestamp": Date().timeIntervalSince1970,
                "userData": [
                    "name": "Tu Nombre",
                    "settings": ["darkMode": true]
                ]
            ]
            
            connection.sendDataToPC(appState)
            print("✅ Estado sincronizado")
        }
    }
}
```

### Dashboard React para PC:

```javascript
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

export function SyncMonitor() {
    const [sessionData, setSessionData] = useState([]);
    const socket = io('http://localhost:3000');

    useEffect(() => {
        socket.on('syncData', (data) => {
            setSessionData(prev => [
                { ...data, id: Date.now() },
                ...prev.slice(0, 9)
            ]);
        });

        return () => socket.off('syncData');
    }, []);

    return (
        <div>
            <h2>📊 Datos Sincronizados</h2>
            {sessionData.map(item => (
                <div key={item.id}>
                    <p>Fuente: {item.source}</p>
                    <pre>{JSON.stringify(item.payload, null, 2)}</pre>
                </div>
            ))}
        </div>
    );
}
```

---

## 💾 Ejemplo 2: Guardar y Restaurar Sesión

### Estructura de Datos

```json
{
  "sessionID": "abc-123-def",
  "timestamp": "2025-06-07T10:30:00Z",
  "appState": {
    "currentScreen": "profile",
    "scrollPosition": 150,
    "selectedItem": "item-42"
  },
  "userPreferences": {
    "theme": "dark",
    "language": "es",
    "notifications": true
  },
  "cache": {
    "lastFetch": "2025-06-07T10:25:00Z",
    "itemCount": 42
  }
}
```

### Servidor - Guardar Sesión

```javascript
// En server.js
app.post('/save-session', (req, res) => {
    const { sessionID, data } = req.body;
    
    sessionData[sessionID] = {
        ...data,
        savedAt: new Date().toISOString()
    };
    
    // Guardar a archivo (opcional)
    fs.writeFileSync(
        `sessions/${sessionID}.json`,
        JSON.stringify(sessionData[sessionID], null, 2)
    );
    
    io.emit('sessionSaved', { sessionID, success: true });
    res.json({ success: true });
});

// Restaurar sesión
app.get('/session/:sessionID', (req, res) => {
    const { sessionID } = req.params;
    
    if (sessionData[sessionID]) {
        res.json(sessionData[sessionID]);
    } else {
        res.status(404).json({ error: 'Sesión no encontrada' });
    }
});
```

### iPhone - Restaurar Sesión

```swift
class SessionManager {
    static let shared = SessionManager()
    
    func saveSession(_ data: [String: Any]) {
        if let jsonData = try? JSONSerialization.data(withJSONObject: data) {
            UserDefaults.standard.set(jsonData, forKey: "appSession")
            print("✅ Sesión guardada localmente")
        }
    }
    
    func restoreSession() -> [String: Any]? {
        guard let jsonData = UserDefaults.standard.data(forKey: "appSession") else {
            return nil
        }
        return try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any]
    }
}
```

---

## 🔄 Ejemplo 3: Sincronización Bidireccional

```
iPhone ────┐
           │
        Servidor (Socket.IO)
           │
PC ────────┘
```

### Flujo de sincronización:

1. **iPhone detecta cambio**
   ```swift
   connection.sendDataToPC(["action": "itemUpdated", "itemID": "123"])
   ```

2. **Servidor recibe y broadcast**
   ```javascript
   socket.on('mobileData', (data) => {
       io.emit('syncData', data);
   });
   ```

3. **PC recibe y actualiza**
   ```javascript
   socket.on('syncData', (data) => {
       if (data.source === 'ios') {
           updateLocalData(data.payload);
           saveToDisk(data.payload);
       }
   });
   ```

4. **Confirmación al iPhone**
   ```javascript
   socket.emit('dataReceived', { success: true, timestamp: Date.now() });
   ```

---

## 🚨 Ejemplo 4: Sincronización Condicional

Solo sincroniza si los datos cambieron realmente:

```javascript
// Servidor
const lastState = {};

function shouldSync(newData, deviceId) {
    const lastData = lastState[deviceId] || {};
    
    // Comparar hashes en lugar de objetos completos
    const newHash = JSON.stringify(newData);
    const lastHash = JSON.stringify(lastData);
    
    if (newHash !== lastHash) {
        lastState[deviceId] = newData;
        return true;
    }
    return false;
}

socket.on('mobileData', (data) => {
    if (shouldSync(data, socket.id)) {
        console.log('✅ Datos sincronizados');
        io.emit('syncData', data);
    } else {
        console.log('⏭️ Sin cambios, saltar sync');
    }
});
```

---

## 📤 Ejemplo 5: Transferencia de Archivos/Contenido Grande

Para archivos grandes, divide en chunks:

```javascript
// Servidor
app.post('/upload-chunk', (req, res) => {
    const { sessionID, chunkIndex, totalChunks, data } = req.body;
    
    if (!chunks[sessionID]) chunks[sessionID] = {};
    chunks[sessionID][chunkIndex] = data;
    
    // Si todos los chunks llegaron, combinar
    if (Object.keys(chunks[sessionID]).length === totalChunks) {
        const fullData = Object.keys(chunks[sessionID])
            .sort((a, b) => a - b)
            .map(k => chunks[sessionID][k])
            .join('');
        
        io.emit('fileReceived', { sessionID, size: fullData.length });
        delete chunks[sessionID];
    }
    
    res.json({ chunkIndex, received: true });
});
```

### iPhone:

```swift
func uploadLargeFile(_ fileData: Data) {
    let chunkSize = 1024 * 1024  // 1 MB por chunk
    let totalChunks = (fileData.count + chunkSize - 1) / chunkSize
    
    for i in 0..<totalChunks {
        let start = i * chunkSize
        let end = min(start + chunkSize, fileData.count)
        let chunk = fileData[start..<end]
        
        // Enviar chunk
        let chunkDict: [String: Any] = [
            "sessionID": "current",
            "chunkIndex": i,
            "totalChunks": totalChunks,
            "data": chunk.base64EncodedString()
        ]
        
        URLSession.shared.uploadTask(with: URL(string: "http://server/upload-chunk")!,
            from: try! JSONEncoder().encode(chunkDict)
        ).resume()
    }
}
```

---

## 🔐 Ejemplo 6: Sincronización con Autenticación

```javascript
// Servidor - Middleware de autenticación
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (isValidToken(token)) {
        socket.userId = extractUserId(token);
        next();
    } else {
        next(new Error('Autenticación fallida'));
    }
});

// Solo sincronizar entre dispositivos del mismo usuario
socket.on('mobileData', (data) => {
    io.to(`user:${socket.userId}`).emit('syncData', {
        ...data,
        source: 'ios',
        userId: socket.userId
    });
});
```

### iPhone:

```swift
func connectWithAuth(ipAddress: String, token: String) {
    let url = URL(string: "http://\(ipAddress):3000")!
    
    var config = SocketIOClientConfiguration()
    config.insert(.extraHeaders(["Authorization": "Bearer \(token)"]))
    
    manager = SocketManager(socketURL: url, config: config)
    socket = manager?.defaultSocket
    socket?.connect()
}
```

---

## 📊 Ejemplo 7: Monitoreo de Actividad

```javascript
// Servidor - Rastrear actividad
const activity = {
    totalSync: 0,
    syncBySource: { ios: 0, pc: 0 },
    bytesTransferred: 0
};

socket.on('mobileData', (data) => {
    activity.totalSync++;
    activity.syncBySource.ios++;
    activity.bytesTransferred += JSON.stringify(data).length;
    
    console.log(`📊 Total: ${activity.totalSync} | iOS: ${activity.syncBySource.ios}`);
});

// API para ver estadísticas
app.get('/stats', (req, res) => {
    res.json({
        activity,
        connectedDevices: Object.keys(connectedDevices).length,
        uptime: process.uptime()
    });
});
```

---

## 🎯 Ejemplo 8: Manejo de Desconexiones y Reconexiones

```swift
class RobustConnectionManager: NSObject, ObservableObject {
    var reconnectAttempts = 0
    let maxReconnectAttempts = 5
    
    func connectToPC(ipAddress: String) {
        // ... código de conexión ...
        
        socket?.on(clientEvent: .disconnect) { _, _ in
            self.handleDisconnection(ipAddress: ipAddress)
        }
    }
    
    func handleDisconnection(ipAddress: String) {
        if reconnectAttempts < maxReconnectAttempts {
            reconnectAttempts += 1
            let delay = pow(2.0, Double(reconnectAttempts))  // Backoff exponencial
            
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                print("🔄 Intentando reconectar (intento \(self.reconnectAttempts))")
                self.connectToPC(ipAddress: ipAddress)
            }
        } else {
            print("❌ Máximo de intentos alcanzado")
            // Mostrar alerta al usuario
        }
    }
}
```

---

## 📋 Resumen de Flujos

| Escenario | Flujo | Uso |
|-----------|-------|-----|
| Sincronizar estado | iPhone → Servidor → PC | App state, settings |
| Guardar sesión | iPhone → Servidor → Disk | Persistencia |
| Actualización bidireccional | iPhone ↔ Servidor ↔ PC | Edición colaborativa |
| Transferencia grande | Chunks → Servidor → Almacenamiento | Archivos, media |
| Con autenticación | Token → Servidor → Socket | Multi-usuario |
| Resiliente | Reconexión automática | Redes inestables |

---

**¡Usa estos ejemplos como base para tu implementación! 🚀**
