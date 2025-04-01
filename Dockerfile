# Use the official Nginx image from Docker Hub
FROM nginx:stable-alpine

# Remove the default Nginx configuration file
RUN rm /etc/nginx/conf.d/default.conf

# Copy a custom Nginx configuration file (optional, but good practice)
# You can create a simple nginx.conf if needed, or rely on defaults for basic serving
# COPY nginx.conf /etc/nginx/conf.d/

# Copy the game's static files (HTML, CSS, JS) into the Nginx web root directory
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/

# Expose port 80 (the default HTTP port Nginx listens on)
EXPOSE 80

# The default Nginx command starts the server, so no explicit CMD is needed unless customizing
# CMD ["nginx", "-g", "daemon off;"] # This is the default command


