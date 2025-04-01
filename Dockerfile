# Use the official Nginx image from Docker Hub
# Using alpine-slim for a smaller image size
FROM nginx:stable-alpine-slim

# Remove the default Nginx configuration files
RUN rm /etc/nginx/conf.d/*

# Copy the game's static files (HTML, CSS, JS) into the Nginx web root directory
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/

# Copy our custom Nginx configuration directly to the final location
# Nginx will load this configuration by default.
COPY nginx.conf /etc/nginx/nginx.conf

# Explicitly set permissions for web root and config file
# Ensure Nginx process can read these files.
RUN chmod -R 755 /usr/share/nginx/html && \
    chmod 644 /etc/nginx/nginx.conf

# Expose port 8080 (for documentation and local testing)
# Cloud Run uses this port based on the container's listening behavior.
EXPOSE 8080

# Command to run when the container starts:
# Just start Nginx in the foreground. It will use /etc/nginx/nginx.conf.
CMD ["nginx", "-g", "daemon off;"]

