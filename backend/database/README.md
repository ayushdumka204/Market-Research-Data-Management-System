# MongoDB collections

Mongoose creates these collections and indexes automatically when the backend connects to MongoDB Atlas:

- `users` — account details and bcrypt password hashes
- `apitokens` — hashed bearer tokens and expiry dates
- `projects` — research project details
- `responses` — survey responses linked to projects

No SQL migration or seed script is required. Create the first administrator using `npm run create-admin` from the backend folder.
