
import { flux } from './src/lib/flux/client';

async function checkSchema() {
    try {
        const { rows, error } = await flux.sql("SELECT * FROM super_admins LIMIT 1");
        if (error) {
            console.error("Error:", error);
            return;
        }
        console.log("Columns found:", Object.keys(rows[0] || {}));
    } catch (err) {
        console.error("Failed to execute query:", err);
    }
}

checkSchema();
