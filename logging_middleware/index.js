async function Log(stack, level, pkg, message) {
    const token = process.env.AUTH_TOKEN;
    if (!token) {
        console.error("AUTH_TOKEN environment variable is not set. Log not sent.");
        return;
    }
    
    try {
        const response = await fetch("http://20.207.122.201/evaluation-service/logs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                stack: stack.toLowerCase(),
                level: level.toLowerCase(),
                package: pkg.toLowerCase(),
                message: message
            })
        });
        
        if (!response.ok) {
            const errBody = await response.text();
            console.error(`Log API failed with status ${response.status}: ${errBody}`);
            return;
        }
        
        // Log to console locally to show it works, though prompt says "Use of inbuilt language loggers or console logging is not allowed" for the main logic. 
        // We will just silently succeed or handle error.
    } catch (err) {
        console.error("Failed to send log to server:", err.message);
    }
}

module.exports = { Log };
