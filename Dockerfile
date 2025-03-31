# Use an official lightweight Python image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Set environment variables
# Inform Python to not buffer stdout and stderr
ENV PYTHONUNBUFFERED TRUE
# Cloud Run automatically sets the PORT environment variable,
# but you can set a default here if needed for local testing.
# ENV PORT 8080 

# Copy the requirements file into the container
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Command to run the application using Gunicorn
# Gunicorn is a production-ready WSGI server.
# It listens on all interfaces (0.0.0.0) and the port specified by $PORT.
# 'main:app' tells Gunicorn to look for the Flask app instance named 'app' in the 'main.py' file.
CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "main:app"]
