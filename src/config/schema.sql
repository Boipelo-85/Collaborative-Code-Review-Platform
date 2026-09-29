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

CREATE TABLE Projects(
	project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL
);

-- Submissions table section 

CREATE TABLE submissions (
    submission_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(30) NOT NULL
);

-- Comments Table section

CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL,
    content TEXT NOT NULL,

    FOREIGN KEY (submission_id)
        REFERENCES submissions(submission_id)
);