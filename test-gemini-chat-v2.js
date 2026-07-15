const API_KEY = 'AQ.Ab8RN6JLQKb-3wO377Eu2KJk17kcRbsgeYnj7QCSztk3v31roQ';

async function test() {
    try {
        // Usando el modelo gemini-2.5-flash (el que funciona)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: "Hola, ¿cómo estás? Soy un paciente nuevo"
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