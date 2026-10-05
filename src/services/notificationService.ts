
import type { PoolClient } from 'pg';

export interface NotificationEvent {
    id: number;
    user_id: number;
    type: string;
    message: string;
    read: boolean;
    created_at: Date;
}

export const createNotification = async (
    client: PoolClient,
    userId: number,
    type: string,
    message: string
): Promise<NotificationEvent> => {
    const result = await client.query<NotificationEvent>(
        `INSERT INTO Notifications (user_id, type, message)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, type, message, read, created_at`,
        [userId, type, message]
    );
    const notification = result.rows[0];
    if (!notification) {
        throw new Error('Notification insert did not return a row');
    }
    return notification;
};
