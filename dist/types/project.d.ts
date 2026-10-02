export interface Project {
    id: number;
    name: string;
    description?: string;
    created_at: Date;
    owner_id: number;
}
export interface CreateProjectInput {
    name: string;
    description: string;
}
export interface UpdateProjectInput {
    name?: string;
    description?: string;
}
export interface ProjectMember {
    project_id: number;
    user_id: number;
    role: string;
}
export interface ProjectWithOwner extends Project {
    owner_email: string;
    owner_name: string;
}
//# sourceMappingURL=project.d.ts.map