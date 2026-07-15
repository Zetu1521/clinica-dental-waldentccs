const API_KEY = 'AQ.Ab8RN6JZkOXKJhB-ATyMQDg8l4aXda0EvOFwXdXOJaWUgWfX1Q';

async function testModel(modelo) {
    try {
        console.log(`🔍 Probando modelo: ${modelo}`);
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: "Hola, dime tu nombre"
                        }]
                    }]
                })
            }
        );

        const data = await response.json();
        
        if (response.ok) {
            const respuesta = data.candidates[0].content.parts[0].text;
            console.log(`✅ ${modelo} funciona!`);
            console.log(`📝 Respuesta: ${respuesta}\n`);
            return true;
        } else {
            console.log(`❌ ${modelo} falló:`, data.error?.message || 'Error desconocido');
            console.log('');
            return false;
        }
    } catch (error) {
        console.log(`❌ ${modelo} error de conexión\n`);
        return false;
    }
}

async function testTodos() {
    console.log('🚀 Probando modelos alternativos...\n');
    
    const modelos = [
        'gemini-2.0-flash-lite',
        'gemini-flash-latest',
        'gemini-2.0-flash-001',
        'gemini-pro-latest'
    ];
    
    for (const modelo of modelos) {
        await testModel(modelo);
    }
}

testTodos();