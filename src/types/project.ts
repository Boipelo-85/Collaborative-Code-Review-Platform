
// import  {query} from '../config/database.js';
// // import type {Project} from '../types'

export interface Project {
  id: number; 
  name: string;            
  description?: string;    
  created_at: Date;        
  owner_id: number;       

}
// Input type for creating a project (request body)
export interface CreateProjectInput{

        name : string;
        description : string;

}
// Input type for updating a project
export interface UpdateProjectInput {

        name?: string;
        description?: string;  
}
export interface ProjectMember {

            project_id : number;
            user_id : number;
            role : string;

}
// Response type for listing projects with owner info
export interface ProjectWithOwner extends Project {
            owner_email: string;
            owner_name: string;
}