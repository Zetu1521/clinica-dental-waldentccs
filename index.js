const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// ============================================
// CONFIGURACIÓN
// ============================================
const JWT_SECRET = 'clinica_odontologica_secret_key_2024';
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURACIÓN DE GROQ (GRATUITO)
// ============================================
const GROQ_API_KEY = process.env.GROQ_API_KEY || 'gsk_tu_clave_aqui';

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// CONEXIÓN A POSTGRESQL
// ============================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
    } else {
        console.log('✅ Conectado a PostgreSQL exitosamente');
    }
});

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================
function verificarToken(req, res, next) {
    const token = req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ error: 'No autorizado. Inicia sesión primero.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

function verificarAdmin(req, res, next) {
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
}

// ============================================
// ENDPOINTS DE AUTENTICACIÓN
// ============================================

// 1. REGISTRO DE USUARIOS
app.post('/api/registro', async (req, res) => {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        const usuarioExistente = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ error: 'Este email ya está registrado' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
            [nombre, email, hashedPassword, rol || 'usuario']
        );

        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            usuario: result.rows[0]
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

// 2. LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const usuario = result.rows[0];

        if (!usuario) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
            mensaje: 'Login exitoso',
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// 3. VERIFICAR SESIÓN
app.get('/api/verificar', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nombre, email, rol FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            autenticado: true,
            usuario: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar sesión' });
    }
});

// 4. CERRAR SESIÓN
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ mensaje: 'Sesión cerrada exitosamente' });
});

// 5. CREAR USUARIO ADMIN
app.post('/api/crear-admin', async (req, res) => {
    const { nombre, email, password } = req.body;

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
            [nombre, email, hashedPassword, 'admin']
        );

        res.json({
            mensaje: 'Usuario administrador creado',
            usuario: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ENDPOINTS PROTEGIDOS
// ============================================

// 6. OBTENER TODOS LOS PACIENTES
app.get('/api/pacientes', verificarToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pacientes ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Error en /api/pacientes:', err);
        res.status(500).json({ error: err.message });
    }
});

// 7. OBTENER TODOS LOS DOCTORES
app.get('/api/doctores', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM doctores ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Error en /api/doctores:', err);
        res.status(500).json({ error: err.message });
    }
});

// 8. CREAR DOCTOR
app.post('/api/doctores', verificarToken, verificarAdmin, async (req, res) => {
    const { nombre, especialidad, email, instagram } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO doctores (nombre, especialidad, email, instagram) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, especialidad, email, instagram]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. ELIMINAR DOCTOR
app.delete('/api/doctores/:id', verificarToken, verificarAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM doctores WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Doctor eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. OBTENER TRATAMIENTOS
app.get('/api/tratamientos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tratamientos ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Error en /api/tratamientos:', err);
        res.status(500).json({ error: err.message });
    }
});

// 11. CREAR TRATAMIENTO
app.post('/api/tratamientos', verificarToken, verificarAdmin, async (req, res) => {
    const { nombre, descripcion, precio, duracion_minutos } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO tratamientos (nombre, descripcion, precio, duracion_minutos) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, descripcion, precio, duracion_minutos]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 12. ELIMINAR TRATAMIENTO
app.delete('/api/tratamientos/:id', verificarToken, verificarAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM tratamientos WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Tratamiento eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 13. OBTENER CITAS
app.get('/api/citas', verificarToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id,
                p.nombre as paciente_nombre,
                p.apellido as paciente_apellido,
                d.nombre as doctor_nombre,
                t.nombre as tratamiento,
                c.fecha_cita,
                c.estado,
                c.notas
            FROM citas c
            LEFT JOIN pacientes p ON c.paciente_id = p.id
            LEFT JOIN doctores d ON c.doctor_id = d.id
            LEFT JOIN tratamientos t ON c.tratamiento_id = t.id
            ORDER BY c.fecha_cita DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error en /api/citas:', err);
        res.status(500).json({ error: err.message });
    }
});

// 14. CREAR CITA (público)
app.post('/api/citas', async (req, res) => {
    const { nombre, apellido, email, telefono, doctor_id, tratamiento_id, fecha, notas } = req.body;

    if (!nombre || !email || !doctor_id || !tratamiento_id || !fecha) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
        let paciente = await pool.query('SELECT id FROM pacientes WHERE email = $1', [email]);
        let pacienteId;

        if (paciente.rows.length === 0) {
            const nuevoPaciente = await pool.query(
                'INSERT INTO pacientes (nombre, apellido, email, telefono) VALUES ($1, $2, $3, $4) RETURNING id',
                [nombre, apellido || '', email, telefono]
            );
            pacienteId = nuevoPaciente.rows[0].id;
        } else {
            pacienteId = paciente.rows[0].id;
        }

        const cita = await pool.query(
            `INSERT INTO citas (paciente_id, doctor_id, tratamiento_id, fecha_cita, notas, estado)
             VALUES ($1, $2, $3, $4, $5, 'pendiente') RETURNING *`,
            [pacienteId, doctor_id, tratamiento_id, fecha, notas || '']
        );

        res.status(201).json({
            mensaje: 'Cita agendada exitosamente',
            cita: cita.rows[0]
        });

    } catch (err) {
        console.error('Error en POST /api/citas:', err);
        res.status(500).json({ error: err.message });
    }
});

// 15. OBTENER INVENTARIO
app.get('/api/inventario', verificarToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inventario ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 16. CREAR INVENTARIO
app.post('/api/inventario', verificarToken, verificarAdmin, async (req, res) => {
    const { nombre, descripcion, cantidad, precio_unitario, categoria } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO inventario (nombre, descripcion, cantidad, precio_unitario, categoria) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nombre, descripcion, cantidad, precio_unitario, categoria]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 17. ELIMINAR INVENTARIO
app.delete('/api/inventario/:id', verificarToken, verificarAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM inventario WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Producto eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 18. OBTENER GASTOS
app.get('/api/gastos', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM gastos ORDER BY fecha_gasto DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 19. CREAR GASTO
app.post('/api/gastos', verificarToken, verificarAdmin, async (req, res) => {
    const { descripcion, monto, categoria, proveedor } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO gastos (descripcion, monto, categoria, proveedor) VALUES ($1, $2, $3, $4) RETURNING *',
            [descripcion, monto, categoria, proveedor]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 20. OBTENER PAGOS
app.get('/api/pagos', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pagos ORDER BY fecha_pago DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// 21. CHATBOT CON GROQ (GRATUITO)
// ============================================
app.post('/api/chat', async (req, res) => {
    const { mensaje } = req.body;

    if (!mensaje) {
        return res.status(400).json({ error: 'Mensaje requerido' });
    }

    console.log('📤 Mensaje recibido:', mensaje);

    // Verificar si la API Key de Groq está configurada
    if (!GROQ_API_KEY || GROQ_API_KEY === 'gsk_tu_clave_aqui') {
        console.log('⚠️ GROQ_API_KEY no configurada. Usando respuestas predefinidas.');
        return usarRespuestaPredefinida(mensaje, res);
    }

    try {
        console.log('🔄 Intentando con Groq...');

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: `Eres DentalBot, el asistente virtual de una clínica odontológica premium llamada "Clínica Dental".
                        Responde en español, de manera profesional, amable y cálida.
                        
                        Información de la clínica:
                        - Nombre: Clínica Dental
                        - Dirección: Av. Principal, Centro Médico, Piso 3, Caracas
                        - Teléfono: +58 212-555-1234
                        - Email: info@clinicadental.com
                        - Horario: Lunes a viernes de 8:00 AM a 6:00 PM
                        
                        Tratamientos y precios:
                        - Limpieza Dental: $80
                        - Blanqueamiento: $250
                        - Ortodoncia (Brackets): $1200
                        - Implantes Dentales: $1500
                        - Endodoncia (Conductos): $350
                        - Carillas Estéticas: $500 por pieza
                        
                        Si el usuario pregunta por citas, guíalo al formulario de la página.
                        Si pregunta por precios, dale la información exacta.
                        Sé conciso pero completo en tus respuestas.`
                    },
                    {
                        role: "user",
                        content: mensaje
                    }
                ],
                temperature: 0.7,
                max_tokens: 500,
            })
        });

        const data = await response.json();

        if (response.ok && data.choices && data.choices.length > 0) {
            const respuesta = data.choices[0].message.content;
            console.log('✅ Respuesta de Groq');
            return res.json({
                mensaje: mensaje,
                respuesta: respuesta,
                timestamp: new Date().toISOString(),
                fuente: 'groq'
            });
        } else {
            console.error('❌ Groq error:', data);
            return usarRespuestaPredefinida(mensaje, res);
        }
    } catch (error) {
        console.error('❌ Error en Groq:', error.message);
        return usarRespuestaPredefinida(mensaje, res);
    }
});

// ============================================
// FUNCIÓN DE RESPALDO (RESPUESTAS PREDEFINIDAS)
// ============================================
function usarRespuestaPredefinida(mensaje, res) {
    const msg = mensaje.toLowerCase();
    let respuesta = '';

    const respuestas = {
        'hola': '¡Hola! Bienvenido a Clínica Dental. Soy DentalBot, tu asistente virtual. ¿En qué puedo ayudarte hoy? 😊',
        'buenos días': '¡Buenos días! ¿Cómo puedo ayudarte con tu salud dental hoy? 😊',
        'buenas tardes': '¡Buenas tardes! ¿En qué puedo asistirte? 😊',
        'cita': '📅 Para agendar una cita, usa el formulario que está más abajo en la página. ¡Te esperamos!',
        'precio': '💰 Limpieza: $80 | Blanqueamiento: $250 | Ortodoncia: $1200 | Implantes: $1500 | Endodoncia: $350 | Carillas: $500',
        'limpieza': '🦷 Limpieza dental: $80, 45 minutos. Recomendada cada 6 meses.',
        'blanqueamiento': '✨ Blanqueamiento: $250, 60 minutos. Resultados desde la primera sesión.',
        'dirección': '📍 Av. Principal, Centro Médico, Piso 3, Caracas.',
        'horario': '🕐 Lunes a viernes 8am-6pm. Sábados con cita previa.',
        'gracias': '¡De nada! ¿Hay algo más en lo que pueda ayudarte? 😊',
        'adios': '¡Hasta luego! Cuida tu sonrisa. ¡Que tengas un excelente día! 😊🦷',
    };

    for (const [key, value] of Object.entries(respuestas)) {
        if (msg.includes(key)) {
            respuesta = value;
            break;
        }
    }

    if (!respuesta) {
        respuesta = 'Gracias por tu mensaje. 😊 ¿Te gustaría agendar una cita, conocer nuestros precios o saber más sobre nuestros tratamientos? También puedes llamarnos al +58 212-555-1234.';
    }

    console.log('📝 Usando respuesta predefinida');
    res.json({
        mensaje: mensaje,
        respuesta: respuesta,
        timestamp: new Date().toISOString(),
        fuente: 'predefinida'
    });
}

// ============================================
// 22. TEST DE CONEXIÓN
// ============================================
app.get('/api/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() as tiempo');
        res.json({
            mensaje: '✅ Conexión exitosa',
            tiempo: result.rows[0],
            version: 'PostgreSQL'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// RUTA PRINCIPAL
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📁 Serviendo archivos desde: ${path.join(__dirname, 'public')}`);
    console.log('\n📋 Endpoints disponibles:');
    console.log(`  POST http://localhost:${PORT}/api/login`);
    console.log(`  POST http://localhost:${PORT}/api/registro`);
    console.log(`  POST http://localhost:${PORT}/api/crear-admin`);
    console.log(`  GET  http://localhost:${PORT}/api/verificar`);
    console.log(`  POST http://localhost:${PORT}/api/logout`);
    console.log(`  POST http://localhost:${PORT}/api/chat (Groq)`);
});