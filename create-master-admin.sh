#!/bin/bash

# Create Master Admin Script
# This creates a master admin user who can manage all organizations

API_URL="http://localhost:8080"

echo "👑 Creating Master Admin User"
echo "============================="
echo ""

# Prompt for master admin details
read -p "Master Admin Email: " MASTER_EMAIL
read -sp "Master Admin Password: " MASTER_PASSWORD
echo ""
read -p "Master Admin Name: " MASTER_NAME

echo ""
echo "Creating master admin user..."

# Use MongoDB to directly create master admin (since we need to bypass team/org requirements)
cat > /tmp/create_master_admin.js << EOF
db = db.getSiblingDB('${MONGO_DB:-signaltrue}');

// Hash the password (bcrypt with 10 rounds)
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);
const hashedPassword = bcrypt.hashSync('${MASTER_PASSWORD}', salt);

// Create master admin
const result = db.users.insertOne({
  email: '${MASTER_EMAIL}',
  password: hashedPassword,
  name: '${MASTER_NAME}',
  role: 'master_admin',
  isMasterAdmin: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('✅ Master admin created with ID: ' + result.insertedId);
EOF

# Execute via mongo shell
mongosh < /tmp/create_master_admin.js
rm /tmp/create_master_admin.js

echo ""
echo "============================="
echo "✅ Master Admin Setup Complete!"
echo ""
echo "Login credentials:"
echo "  Email: ${MASTER_EMAIL}"
echo "  Password: [hidden]"
echo ""
echo "Visit http://localhost:3000/login to access the master admin dashboard"
echo ""
