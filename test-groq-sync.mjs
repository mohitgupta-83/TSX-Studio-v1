// Native fetch used

const GROQ_API_KEY = "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";
const MODELS = [
    "qwen/qwen3-32b",
    "moonshotai/kimi-k2-instruct",
    "openai/gpt-oss-120b",
    "llama-3.1-8b-instant"
];

async function testModel(model) {
    console.log(`\n--- Testing Model: ${model} ---`);
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: "Reply with 'Model: " + model + "'. Status: Online." }],
                model: model,
                max_completion_tokens: 50
            })
        });
        
        const data = await response.json();
        if (data.choices && data.choices[0]) {
            console.log(`Response: ${data.choices[0].message.content}`);
        } else {
            console.log(`Error: ${JSON.stringify(data.error?.message || data)}`);
        }
    } catch (err) {
        console.error(`Failed to test:`, err.message);
    }
}

async function run() {
    for (const model of MODELS) {
        await testModel(model);
    }
    console.log("\n--- TEST COMPLETE ---");
}

run();
