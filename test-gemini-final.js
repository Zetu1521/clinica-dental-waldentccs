const API_KEY = 'AQ.Ab8RN6JZkOXKJhB-ATyMQDg8l4aXda0EvOFwXdXOJaWUgWfX1Q';

async function test() {
    try {
        // Usando gemini-2.0-flash (disponible para todos)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: "Hola, soy un paciente nuevo. ¿Qué servicios ofrecen?"
                        }]
                    }]
                })
            }
        );

        const data = await response.json();
        
        if (response.ok) {
            const respuesta = data.candidates[0].content.parts[0].text;
            console.log('✅ Respuesta:', respuesta);
        } else {
            console.error('❌ Error:', data);
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
    }
}

test();