const express = require('express');
const { Log } = require('logging_middleware/index');

const app = express();
app.use(express.json());

const WEIGHTS = {
    "Placement": 3,
    "Result": 2,
    "Event": 1
};

async function fetchNotifications() {
    const token = process.env.AUTH_TOKEN;
    const response = await fetch("http://20.207.122.201/evaluation-service/notifications", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Failed to fetch notifications");
    const data = await response.json();
    return data.notifications;
}

app.get('/api/priority-inbox', async (req, res) => {
    try {
        await Log("backend", "info", "route", "Priority inbox API called");
        
        const notifications = await fetchNotifications();
        await Log("backend", "info", "db", `Fetched ${notifications.length} notifications`);
        
        notifications.sort((a, b) => {
            const weightA = WEIGHTS[a.Type] || 0;
            const weightB = WEIGHTS[b.Type] || 0;
            
            if (weightA !== weightB) {
                return weightB - weightA;
            }
            
            const timeA = new Date(a.Timestamp).getTime();
            const timeB = new Date(b.Timestamp).getTime();
            return timeB - timeA;
        });
        
        const top10 = notifications.slice(0, 10);
        
        await Log("backend", "info", "route", "Computed top 10 notifications");
        
        res.status(200).json({
            message: "Top 10 Priority Notifications",
            count: top10.length,
            notifications: top10
        });
        
    } catch (err) {
        await Log("backend", "error", "route", `Notification error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Notification Backend running on port ${PORT}`);
});
