import os
from flask import Flask

# Initialize the Flask application
app = Flask(__name__)

# Define a route for the root URL ("/")
@app.route('/')
def hello_world():
  """Returns a simple Hello World message."""
  # You can customize this message
  message = "Hello World!"
  return message

if __name__ == "__main__":
  # Get the port number from the environment variable PORT, default to 8080
  # Cloud Run sets this environment variable automatically.
  port = int(os.environ.get('PORT', 8080))
  
  # Run the Flask app
  # Host '0.0.0.0' makes the server accessible from outside the container
  app.run(debug=True, host='0.0.0.0', port=port)
