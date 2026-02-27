import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { FluxClient } from './src/lib/flux/client';

async function debug() {
    const flux = new FluxClient();

    // Select the manoj gym 
    const selectQuery = `SELECT id, name FROM gyms WHERE name = 'manoj gym ' LIMIT 1`;
    let { rows, error } = await flux.sql(selectQuery);

    if (error || rows.length === 0) {
        console.log("Error or gym not found.");
        return;
    }

    const gymId = rows[0].id;
    console.log("Found gym to cascade delete:", gymId);

    // Try deleting using exact ID cascade
    const cleanId = gymId;
    await Promise.all([
        flux.sql(`DELETE FROM check_ins WHERE gym_id = '${cleanId}'`),
        flux.sql(`DELETE FROM members WHERE gym_id = '${cleanId}'`),
        flux.sql(`DELETE FROM plans WHERE gym_id = '${cleanId}'`),
        flux.sql(`DELETE FROM announcements WHERE gym_id = '${cleanId}'`)
    ]);

    const deleteQuery = `DELETE FROM gyms WHERE id = '${cleanId}'`;
    const deleteRes = await flux.sql(deleteQuery);

    console.log("Delete result:", deleteRes);

    // Check if it was actually deleted
    const verifyQuery = `SELECT id, name FROM gyms WHERE id = '${gymId}'`;
    const verifyRes = await flux.sql(verifyQuery);

    fs.writeFileSync('debug_output.json', JSON.stringify({
        deleteResult: deleteRes,
        verifyResult: verifyRes.rows
    }, null, 2));
    console.log("Done");
}

debug();
