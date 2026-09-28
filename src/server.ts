import express from 'express';
import dotenv from "dotenv";
import { testDbConnection } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const startServer = async () => {

    await testDbConnection();
    app.use(express.json());

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

startServer()