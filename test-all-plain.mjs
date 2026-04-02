
const GROQ_API_KEY = "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";
const MODELS = [
    "moonshotai/kimi-k2-instruct",
    "moonshotai/kimi-k2-instruct-0905",
    "qwen/qwen3-32b",
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-prompt-guard-2-22m",
    "meta-llama/llama-prompt-guard-2-86m",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-safeguard-20b"
];

async function testModel(model) {
    process.stdout.write(`Testing ${model}... `);
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: "Test message. Respond with 'ACK'." }],
                model: model,
                max_completion_tokens: 10
            })
        });
        
        const data = await response.json();
        if (data.choices && data.choices[0]) {
            console.log(`✅ SUCCESS: "${data.choices[0].message.content.trim()}"`);
            return { model, status: "WORKING", response: data.choices[0].message.content.trim() };
        } else {
            const errorMsg = data.error?.message || JSON.stringify(data);
            console.log(`❌ FAILED: ${errorMsg}`);
            return { model, status: "FAILED", error: errorMsg };
        }
    } catch (err) {
        console.log(`❌ ERROR: ${err.message}`);
        return { model, status: "ERROR", error: err.message };
    }
}

async function run() {
    console.log("=== GROQ API MODEL AVAILABILITY TEST ===\n");
    const results = [];
    for (const model of MODELS) {
        results.push(await testModel(model));
    }
    console.log("\n=== TEST FINAL SUMMARY ===");
    results.forEach(r => console.log(JSON.stringify(r)));
}

run();
