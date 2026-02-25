const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));

/* =========================
   CORE CALCULATION LOGIC
========================= */

function builtUpArea(plotSize, floors) {
    return plotSize * 9 * floors;
}

function estimateDuration(area, floors) {
    return Math.round((area / 85) * (1 + (floors - 1) * 0.1));
}

function workforce(area, duration) {
    return {
        masons: Math.ceil(area / (120 * duration)),
        helpers: Math.ceil(area / (80 * duration)),
        steel_workers: Math.ceil(area / (250 * duration)),
        carpenters: Math.ceil(area / (200 * duration)),
        supervisors: Math.max(1, Math.ceil(area / 15000))
    };
}

function labourDays(workers, duration) {
    const total = Object.values(workers).reduce((a, b) => a + b);
    return total * duration;
}

function materials(area) {
    return {
        cement_bags: Math.round(area * 0.4),
        steel_mt: Number((area * 0.004).toFixed(2)),
        sand_cft: Math.round(area * 1.2),
        water_liters: Math.round(area * 25)
    };
}

function cost(area, rate, compression = 1) {
    const adjustedRate = rate * compression;
    const total = area * adjustedRate;

    return {
        rate_per_sqft: adjustedRate,
        total_cost: Math.round(total),
        material_cost: Math.round(total * 0.6),
        labour_cost: Math.round(total * 0.25),
        overhead: Math.round(total * 0.1),
        contingency: Math.round(total * 0.05)
    };
}

function blueprint(area, floors) {
    const floorArea = area / floors;
    return {
        floor_area_each: Math.round(floorArea),
        layout: {
            living_room: "18x20 ft",
            kitchen: "12x14 ft",
            bedrooms: Math.max(2, Math.floor(floorArea / 900)),
            toilets: Math.max(2, Math.floor(floorArea / 1200))
        }
    };
}

function schedule(duration) {
    return {
        foundation: Math.round(duration * 0.15) + " days",
        structure: Math.round(duration * 0.35) + " days",
        brickwork_plaster: Math.round(duration * 0.2) + " days",
        electrical_plumbing: Math.round(duration * 0.15) + " days",
        finishing: Math.round(duration * 0.15) + " days"
    };
}

/* =========================
   API
========================= */

app.post("/generate", (req, res) => {

    const { scenario, plotSize, floors, duration, ratePerSqft } = req.body;

    if (!plotSize || !floors) {
        return res.status(400).json({ error: "plotSize & floors required" });
    }

    const area = builtUpArea(plotSize, floors);
    const normalDuration = estimateDuration(area, floors);
    const finalDuration = duration || normalDuration;

    let compression = 1;
    if (duration && duration < normalDuration) {
        compression = normalDuration / duration;
    }

    const workers = workforce(area, finalDuration);
    const labour = labourDays(workers, finalDuration);
    const materialData = materials(area);
    const costData = cost(area, ratePerSqft || 2200, compression);

    let response = {
        project_summary: {
            total_sqft: area,
            duration_days: finalDuration,
            weeks: Math.round(finalDuration / 7),
            months: Number((finalDuration / 30).toFixed(1))
        },
        workers,
        total_labour_days: labour,
        materials: materialData,
        cost: costData
    };

    if (scenario == 1) response.blueprint = blueprint(area, floors);
    if (scenario == 2) {
        response.compression_factor = compression.toFixed(2);
        response.optimized_schedule = schedule(finalDuration);
    }
    if (scenario == 3)
        response.cost_per_sqyard = Math.round(costData.total_cost / plotSize);
    if (scenario == 4)
        response.detailed_schedule = schedule(finalDuration);

    res.json(response);
});

app.listen(5000, () =>
    console.log("Server running at http://localhost:5000")
);