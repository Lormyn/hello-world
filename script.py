from google.cloud import bigquery
import os

# Replace 'your-project-id' with your actual GCP project ID
project_id = 'vigilant-art-417714'

def fetch_data():
    client = bigquery.Client(project=project_id)

    query = """
        SELECT * FROM  
        bigquery-public-data.new_york_citibike.citibike_trips
        LIMIT 100
    """

    query_job = client.query(query)
    rows = query_job.result()  # Wait for query to complete

    return [dict(row) for row in rows]  # Convert to a list of dictionaries

def render_response(data):
    # Since we'll return JSON, modify your bike-data.html to fetch and parse JSON
    import json
    return json.dumps(data) 

if __name__ == "__main__":
    bike_data = fetch_data()
    response = render_response(bike_data)
    print(response) 
