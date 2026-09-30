-- User table section

CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_picture TEXT,
	cellphone INT, 
    password VARCHAR(255),
	role VARCHAR(20) NOT NULL DEFAULT 'Submitter'
);

-- Project table section

-- CREATE TABLE Projects(
-- 	project_id INTEGER NOT NULL,
--     user_id INTEGER NOT NULL
-- );

-- Projects metadata table
CREATE TABLE Projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    owner_id INTEGER NOT NULL REFERENCES Users(id)
);

-- ProjectMembers table (relationship between projects and users)
CREATE TABLE ProjectMembers (
    project_id INTEGER NOT NULL REFERENCES Projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'Member',
    PRIMARY KEY (project_id, user_id)
);


-- Submissions table section 

CREATE TABLE submissions (
    submission_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(30) NOT NULL
);

-- Comments Table section

CREATE TABLE Comments (
    comment_id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    line_number INTEGER, -- optional: for inline comments on specific code lines
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
