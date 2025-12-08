#!/bin/bash

BASE_URL="http://localhost:3000"
COOKIE_FILE="cookies.txt"

echo "--- 1. Health Check ---"
curl -s "$BASE_URL/health" | grep "ok" && echo " [PASS]" || echo " [FAIL]"
echo ""

echo "--- 2. Register User 'testuser' ---"
# Randomize username to allow re-running
USERNAME="user_$(date +%s)"
REGISTER_RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"securePassword123!\"}")
echo $REGISTER_RES
echo ""

echo "--- 3. Login ---"
curl -s -c $COOKIE_FILE -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"securePassword123!\"}"
echo ""

echo "--- 4. Create Note ---"
curl -s -b $COOKIE_FILE -X POST "$BASE_URL/notes" \
  -H "Content-Type: application/json" \
  -d '{"title": "My First Secure Note", "content": "This is a secret."}'
echo ""

echo "--- 5. List Notes ---"
curl -s -b $COOKIE_FILE "$BASE_URL/notes"
echo ""

rm $COOKIE_FILE
