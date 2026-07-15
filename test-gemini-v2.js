const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AQ.Ab8RN6JLQKb-3wO377Eu2KJk17kcRbsgeYnj7QCSztk3v31roQ';

// Crear instancia
const genAI = new GoogleGenerativeAI(API_KEY);

// Probar diferentes modelos
const modelos = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-pro"
];

async function probarModelo(modelo) {
    try {
        console.log(`\n🔍 Probando modelo: ${modelo}`);
        const model = genAI.getGenerativeModel({ model: modelo });
        const result = await model.generateContent("Dime tu nombre");
        console.log(`✅ ${modelo} funciona!`);
        console.log(`📝 Respuesta: ${result.response.text()}`);
        return true;
    } catch (error) {
        console.log(`❌ ${modelo} no funciona: ${error.message}`);
        return false;
    }
}

async function testTodos() {
    console.log('🚀 Probando todos los modelos...\n');
    
    for (const modelo of modelos) {
        await probarModelo(modelo);
    }
}

testTodos();