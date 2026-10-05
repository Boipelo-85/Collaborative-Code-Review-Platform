
//Comments attribute form the table
export interface Comment {
    comment_id: number;
    submission_id: number;
    author_id: number;
    line_number: number | null;
    content: string;
    created_at: Date;
    updated_at: Date;
}
//Joining section
export interface CommentWithAuthor extends Comment {
    author_name: string;
    author_role: string;
}

export interface CreateCommentInput {
    content: string;
}

export interface UpdateCommentInput {
    content: string;
}
