const express = require('express');
const { Log } = require('logging_middleware/index');

const app = express();
app.use(express.json());

async function fetchDepots() {
    const token = process.env.AUTH_TOKEN;
    const response = await fetch("http://20.207.122.201/evaluation-service/depots", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Failed to fetch depots");
    const data = await response.json();
    return data.depots;
}

async function fetchVehicles() {
    const token = process.env.AUTH_TOKEN;
    const response = await fetch("http://20.207.122.201/evaluation-service/vehicles", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Failed to fetch vehicles");
    const data = await response.json();
    return data.vehicles;
}

function solveKnapsack(capacity, vehicles) {
    const n = vehicles.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
        const v = vehicles[i - 1];
        for (let w = 0; w <= capacity; w++) {
            if (v.Duration <= w) {
                dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - v.Duration] + v.Impact);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }
    
    let res = dp[n][capacity];
    let w = capacity;
    const chosen = [];
    
    for (let i = n; i > 0 && res > 0; i--) {
        if (res !== dp[i - 1][w]) {
            chosen.push(vehicles[i - 1]);
            res -= vehicles[i - 1].Impact;
            w -= vehicles[i - 1].Duration;
        }
    }
    return chosen;
}

app.post('/api/schedule', async (req, res) => {
    try {
        await Log("backend", "info", "route", "Scheduler API called");
        
        const depots = await fetchDepots();
        await Log("backend", "info", "db", `Fetched ${depots.length} depots`);
        
        const vehicles = await fetchVehicles();
        await Log("backend", "info", "db", `Fetched ${vehicles.length} vehicles`);
        
        const totalBudget = depots.reduce((sum, depot) => sum + depot.MechanicHours, 0);
        await Log("backend", "info", "service", `Total budget: ${totalBudget}`);
        
        const totalDuration = vehicles.reduce((sum, v) => sum + v.Duration, 0);
        
        let scheduled = [];
        if (totalDuration <= totalBudget) {
            scheduled = vehicles;
            await Log("backend", "info", "service", "Budget sufficient for all");
        } else {
            scheduled = solveKnapsack(totalBudget, vehicles);
            await Log("backend", "info", "service", "Ran knapsack optimization");
        }
        
        const totalImpact = scheduled.reduce((sum, v) => sum + v.Impact, 0);
        const usedDuration = scheduled.reduce((sum, v) => sum + v.Duration, 0);
        
        const output = {
            scheduled_vehicles_count: scheduled.length,
            total_impact: totalImpact,
            used_duration: usedDuration,
            budget: totalBudget,
            scheduled_tasks: scheduled.map(v => v.TaskID)
        };
        
        await Log("backend", "info", "route", `Scheduler done. Impact: ${totalImpact}`);
        res.status(200).json(output);
    } catch (err) {
        await Log("backend", "error", "route", `Scheduler error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Vehicle Maintenance Scheduler running on port ${PORT}`);
});
