import { query } from '../config/database.js';
const parseId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};
// Get notifications for a user
export const getUserNotifications = async (req, res) => {
    try {
        const userId = parseId(req.params.id);
        if (userId === null) {
            return res.status(400).json({ message: 'userId must be a positive integer' });
        }
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }
        // Only allow user to view their own notifications, unless Admin
        if (req.user.id !== userId && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'You can only view your own notifications' });
        }
        const result = await query(`SELECT n.id, n.user_id, n.type, n.message, n.created_at, n.read
       FROM Notifications n
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`, [userId]);
        return res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Failed to retrieve notifications:', error);
        return res.status(500).json({ message: 'Failed to retrieve notifications' });
    }
};
//# sourceMappingURL=notificationController.js.map