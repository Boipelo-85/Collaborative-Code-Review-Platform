import { Pool } from "pg";
import dotenv from "dotenv";
import type { StringMappingType } from "typescript/unstable/async";

dotenv.config();

//Initializing the pool to connect to the database attribute section
const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
});

export const query = (text: string ,params?: any[]) => pool.query( text ,params)

//Creating the function to connect to the pool and try for connect and catch for errors
export const testDbConnection = async () => {

        try{

                // coonnect section
                const client = await pool.connect();
                console.log("Database connection seccessful");

                // Check if Users table exists and create it if not
                const tableCheck = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'users'
                    );
                `);

                if (!tableCheck.rows[0].exists) {
                    console.log("Creating Users table...");
                    await client.query(`
                        CREATE TABLE Users (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(100) NOT NULL,
                            email VARCHAR(255) UNIQUE NOT NULL,
                            display_picture TEXT,
                            cellphone INT,
                            password VARCHAR(255)
                        );
                    `);
                    console.log("Users table created successfully");
                } else {
                    // Check if password column needs to be updated
                    const columnCheck = await client.query(`
                        SELECT character_maximum_length
                        FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'password';
                    `);

                    if (columnCheck.rows.length > 0 && columnCheck.rows[0].character_maximum_length < 255) {
                        console.log("Updating password column length...");
                        await client.query(`
                            ALTER TABLE Users ALTER COLUMN password TYPE VARCHAR(255);
                        `);
                        console.log("Password column updated successfully");
                    }
                }

                client.release();

        }catch(error){

                // catch error section
                console.log("Unable to connect to the database ");
                console.error(error);
                process.exit(1);
        }
}


