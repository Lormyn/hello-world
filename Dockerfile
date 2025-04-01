# Use the official Nginx image from Docker Hub
# Using alpine-slim for a smaller image size
FROM nginx:stable-alpine-slim

# Remove the default Nginx configuration files
RUN rm /etc/nginx/conf.d/*

# Copy the game's static files (HTML, CSS, JS) into the Nginx web root directory
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/

# Copy our custom Nginx configuration template into the container
# Note: It's copied to a temporary location first
COPY nginx.conf /etc/nginx/nginx.conf.template

# Nginx doesn't automatically listen on the PORT variable.
# We need to use 'envsubst' to substitute ${PORT} in our template
# with the actual PORT value provided by Cloud Run environment,
# then output it to the final nginx.conf location, and finally start nginx.

# Expose the PORT environment variable (Cloud Run will set this, typically to 8080)
# This EXPOSE instruction is more for documentation; Cloud Run uses the PORT env var regardless.
EXPOSE ${PORT:-8080}

# Command to run when the container starts:
# 1. Use `envsubst` to replace '${PORT}' in the template with the value of the PORT env variable,
#    outputting the result to the actual nginx config file.
# 2. Start Nginx in the foreground (`-g daemon off;`).
CMD sh -c "envsubst '\${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"

