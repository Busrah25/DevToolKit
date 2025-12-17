# DevToolkit

DevToolkit is a responsive, modular web application designed to support students and beginner developers by centralizing development tools, learning resources, and career preparation features in one structured platform. The application was developed as the final group project for CSC 4110 Software Engineering at Wayne State University.

The project demonstrates practical front end architecture, client side behavior, and Firebase based backend integration while following core software engineering principles such as separation of concerns, modular design, and clear documentation.

## Live Deployment
https://busrah25.github.io/devtoolkit/

## Project Objectives
The primary objective of DevToolkit is to reduce fragmentation in beginner developer resources by providing a single, organized platform for tool discovery, learning guidance, and early career preparation. The application emphasizes usability, accessibility, and realistic application behavior suitable for academic evaluation and portfolio presentation.

## Key Features
• Multi page responsive web application  
• Centralized developer tool browsing powered by structured JSON data  
• Tool comparison to support informed decision making  
• Learning and career preparation modules  
• Firebase Authentication for secure user accounts  
• User specific favorites system  
• Contact and suggestion forms with input validation  
• Firestore persistence for signed in users  
• Graceful fallback functionality for signed out users  

## Application Pages
Home  
Tools  
Comparison  
Learn  
Careers  
Contact  
Suggest  
Account (authenticated users only)  
Sign In  
Sign Up  
Reset Password  

## Backend Architecture
DevToolkit uses Firebase as a lightweight backend service.

Authentication  
Firebase Authentication handles user registration, login, logout, session persistence, and password reset functionality.

Data Persistence  
Firebase Firestore securely stores user specific data using scoped collections:

/users/{uid}/favorites  
/users/{uid}/contacts  
/users/{uid}/suggestions  

All data access is protected through Firestore security rules to ensure users can only access their own records.

## Technologies Used
HTML5  
CSS3  
Bootstrap 5.3  
JavaScript ES6 (modular structure)  
Firebase Authentication  
Firebase Firestore  
Git and GitHub Pages  

## Project Structure
DevToolkit/
├── index.html
├── tools.html
├── comparison.html
├── learn.html
├── careers.html
├── contact.html
├── form.html
├── account.html
├── signin.html
├── signup.html
├── reset.html
├── css/
│ └── style.css
├── js/
│ ├── auth.js
│ ├── firebase.js
│ ├── tools.js
│ ├── comparison.js
│ ├── learn.js
│ ├── careers.js
│ ├── favorites.js
│ ├── contact.js
│ ├── form.js
│ ├── account.js
│ ├── signin.js
│ ├── signup.js
│ └── reset.js
├── data/
│ └── tools.json
└── images/
├── logo.png
└── animated.gif


---
## Design and Code Quality
• Single shared global stylesheet for visual consistency  
• No inline CSS or inline JavaScript  
• Page specific logic isolated in dedicated JavaScript modules  
• Clear documentation headers in all scripts  
• Defensive checks to prevent runtime failures  
• Fully responsive layout using Bootstrap grid system  

## Running the Application
Open index.html in any modern web browser.

For development and testing, using Visual Studio Code with the Live Server extension is recommended. No build tools or package installation are required.

## Course Information
Course: CSC 4110 Software Engineering  
Institution: Wayne State University  
Project Type: Final Group Web Application  

## Author
Bushra Ahmed  
Email: busrahkhanom25@gmail.com  
GitHub: https://github.com/Busrah25  
LinkedIn: https://linkedin.com/in/busrah  

## License
MIT License

Copyright (c) 2025 Bushra Ahmed

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files to deal in the software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and or sell copies of the software.

## Disclaimer
DevToolkit references third party developer tools and learning platforms through external links. All trademarks, logos, and content belong to their respective owners and are used strictly for educational purposes.
