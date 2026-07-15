const API_KEY = 'AQ.Ab8RN6JLQKb-3wO377Eu2KJk17kcRbsgeYnj7QCSztk3v31roQ';

async function test() {
    try {
        // Usando el mismo endpoint que funciona en el navegador
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
        );

        const data = await response.json();
        
        console.log('✅ Modelos disponibles:');
        if (data.models) {
            data.models.forEach(model => {
                console.log(`  - ${model.name}`);
            });
        } else {
            console.log('📝 Respuesta:', data);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

test();