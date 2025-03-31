# Use an official lightweight Python image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED TRUE
# ENV PORT 8080 # PORT is usually set by Cloud Run automatically

# Copy the requirements file into the container
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# --- Updated CMD ---
# Use the 'shell' form of CMD. This allows the shell ($0) within the container
# to handle the expansion of the $PORT environment variable directly.
CMD gunicorn --bind 0.0.0.0:$PORT main:app
