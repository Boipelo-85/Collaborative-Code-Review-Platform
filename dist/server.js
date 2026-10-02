import express from 'express';
import dotenv from "dotenv";
import { testDbConnection } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import userRoutes from './routes/userRoutes.js';
import repositoryRoutes from './routes/repositoryRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
dotenv.config();
// Initialize the app and port section
const app = express();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(express.json());
// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Test route works' });
});
// Mount auth routes
console.log('Mounting auth routes...');
app.use('/api/auth', authRoutes);
console.log('Auth routes mounted');
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/repositories', repositoryRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
// starting the server at to run at the localhost section
const startServer = async () => {
    await testDbConnection();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};
startServer();
//# sourceMappingURL=server.js.map