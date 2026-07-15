const { GoogleGenerativeAI } = require('@google/generative-ai');

// ⚠️ PON TU CLAVE COMPLETA AQUÍ
const API_KEY = 'AQ.Ab8RN6JZkOXKJhB-ATyMQDg8l4aXda0EvOFwXdXOJaWUgWfX1Q';

// Crear instancia con la clave
const genAI = new GoogleGenerativeAI(API_KEY);

// Usar el modelo correcto
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash-latest"  // ← CAMBIADO a -latest
});

async function test() {
    try {
        console.log('📤 Enviando: "Hola, ¿cómo estás?"');
        const result = await model.generateContent("Hola, ¿cómo estás?");
        console.log('✅ Respuesta:', result.response.text());
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Status:', error.status);
        console.error('StatusText:', error.statusText);
        console.error('Detalles completos:', error);
    }
}

test();