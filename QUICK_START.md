# 🚀 Inicio Rápido - Tori Claud

¡Conecta tu iPhone con tu PC en 5 minutos!

---

## ⚡ Paso 1: Preparar tu PC/Mac

```bash
# Instalar dependencias
npm install
```

## ⚡ Paso 2: Iniciar el Servidor

```bash
npm start
```

**Verás algo como:**
```
═══════════════════════════════════════════════════════════════
🚀 SERVIDOR TORI CLAUD INICIADO
═══════════════════════════════════════════════════════════════
📍 IP Local: 192.168.1.100
🌐 URL: http://192.168.1.100:3000
📱 Usa esta IP en tu iPhone: 192.168.1.100
═══════════════════════════════════════════════════════════════
```

**⚠️ Guarda esa IP (ej: 192.168.1.100)**

## ⚡ Paso 3: Abrir Dashboard en tu PC

1. Abre tu navegador
2. Ve a: `http://localhost:3000`
3. Deberías ver el panel de control

## ⚡ Paso 4: Conectar tu iPhone

### Opción A: Con Xcode (Recomendado)

1. Abre Xcode
2. Crea un nuevo proyecto "App"
3. Copia el código de `ConnectionManager.swift` del README
4. En la app, ingresa la IP de tu servidor (ej: `192.168.1.100`)
5. ¡Presiona Conectar!

### Opción B: Con Test Simple (Sin Xcode)

Si no tienes Xcode, usa esta URL en tu iPhone:
```
http://192.168.1.100:3000
```

## ⚡ Paso 5: Verificar Conexión

En tu dashboard debería aparecer:
- ✅ Dispositivos conectados: 1 (o más)
- 📊 Datos sincronizando en tiempo real

---

## 🛠️ Comandos Útiles

```bash
# Iniciar servidor con auto-reload (desarrollo)
npm run dev

# Ver estado del servidor
curl http://localhost:3000/status

# Ver dispositivos conectados
curl http://localhost:3000/devices

# Ver sesiones activas
curl http://localhost:3000/sessions

# Enviar datos de prueba
curl -X POST http://localhost:3000/broadcast \
  -H "Content-Type: application/json" \
  -d '{"message": {"test": true}}'
```

---

## 📊 URLs Importantes

| URL | Propósito |
|-----|-----------|
| `http://localhost:3000` | Dashboard de control |
| `http://localhost:3000/status` | Estado del servidor (JSON) |
| `http://localhost:3000/devices` | Lista de dispositivos |
| `http://localhost:3000/sessions` | Datos de sesiones |

---

## 🔗 Estructura de Carpetas

```
tori-claud/
├── server.js          ← Servidor Node.js
├── index.html         ← Dashboard web
├── package.json       ← Dependencias
├── README.md          ← Guía completa
└── QUICK_START.md     ← Este archivo
```

---

## ❓ Problemas Comunes

### "iPhone no conecta"
```bash
# 1. Verifica que estén en la misma WiFi
ping 192.168.1.100  # (usa tu IP)

# 2. Verifica que el servidor esté corriendo
ps aux | grep node
```

### "Dashboard no abre"
```bash
# El puerto 3000 podría estar en uso
lsof -i :3000

# Usa otro puerto
PORT=3001 npm start
```

### "Datos no sincronizan"
- Asegúrate de que ambos estén en la **misma red WiFi**
- Reinicia el servidor: `Ctrl+C` y `npm start`
- Reconecta el iPhone

---

## 📚 Próximos Pasos

1. Leer la **Guía Completa** en `README.md`
2. Implementar tu lógica de sincronización
3. Agregar autenticación y seguridad
4. Implementar cifrado end-to-end

---

**¡Ya está! 🎉 Tu servidor está corriendo y listo para recibir conexiones.**

Para información más detallada, lee `README.md`.
