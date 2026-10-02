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
                            password VARCHAR(255),
                            role VARCHAR(20) NOT NULL DEFAULT 'Submitter'
                        );
                    `);
                    console.log("Users table created successfully");
                } else {
                    const roleColumnCheck = await client.query(`
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'role';
                    `);

                    if (roleColumnCheck.rows.length === 0) {
                        await client.query(`
                            ALTER TABLE Users
                            ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'Submitter';
                        `);
                    }

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

                await client.query(`
                    CREATE TABLE IF NOT EXISTS Projects (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        owner_id INTEGER NOT NULL REFERENCES Users(id)
                    );
                `);

                await client.query(`
                    CREATE TABLE IF NOT EXISTS ProjectMembers (
                        project_id INTEGER NOT NULL REFERENCES Projects(id) ON DELETE CASCADE,
                        user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
                        role VARCHAR(50) DEFAULT 'Member',
                        PRIMARY KEY (project_id, user_id)
                    );
                `);

                client.release();

        }catch(error){

                // catch error section
                console.log("Unable to connect to the database ");
                console.error(error);
                process.exit(1);
        }
}


