#!/bin/bash
# Launch the AI Fitness Trainer with the system Python

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Use the system Python to run the app
/usr/bin/python3 app.py --headless

# Keep the terminal open to see any errors
read -p "Press any key to close..." -n 1 -s
