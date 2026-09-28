import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
//Initializing the pool to connect to the database attribute section
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
export const query = (text, params) => pool.query(text, params);
//Creating the function to connect to the pool and try for connect and catch for errors
export const testDbConnection = async () => {
    try {
        // coonnect section
        const client = await pool.connect();
        console.log("Database connection seccessful");
        client.release();
    }
    catch (error) {
        // catch error section
        console.log("Unable to connect to the database ");
        console.error(error);
        process.exit(1);
    }
};
//# sourceMappingURL=database.js.map