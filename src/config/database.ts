import { Pool } from "pg";
import dotenv from "dotenv";
import type { StringMappingType } from "typescript/unstable/async";

dotenv.config();

const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
});

export const query = (text: string ,params?: any[]) => pool.query( text ,params)

export const testDbConnection = async () => {

        try{

                const client = await pool.connect();
                console.log("Database connection seccessful");
                client.release();

        }catch(error){

                console.log("Unable to connect to the database ");
                console.error(error);
                process.exit(1);
        }
}


