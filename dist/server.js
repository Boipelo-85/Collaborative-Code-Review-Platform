import express from 'express';
import dotenv from "dotenv";
import { testDbConnection } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
dotenv.config();
// Initialize the app and port section
const app = express();
const PORT = process.env.PORT || 5000;
// starting the server at to run at the localhost section
const startServer = async () => {
    await testDbConnection();
    app.use(express.json());
    // Mount auth routes
    app.use('/api/auth', authRoutes);
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};
startServer();
//# sourceMappingURL=server.js.map