import requests
import pandas as pd
import os
from typing import Dict, Optional
import logging

class DatawrapperAutomation:
    def __init__(self, api_token: str):
        """Initialize with your Datawrapper API token."""
        self.api_token = api_token
        self.base_url = "https://api.datawrapper.de/v3"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

    def create_chart(self, title: str, chart_type: str, metadata: Optional[Dict] = None) -> Optional[str]:
        """Create a new chart in Datawrapper."""
        data = {
            "title": title,
            "type": chart_type,
            "metadata": {
                "visualize": {
                    "stacking": "normal"  # Enable stacking
                }
            }
        }
        
        if metadata:
            data.update(metadata)
            
        try:
            response = requests.post(
                f"{self.base_url}/charts",
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            
            chart_info = response.json()
            chart_id = chart_info["id"]
            self.logger.info(f"Successfully created chart: {chart_id}")
            return chart_id
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Failed to create chart: {str(e)}")
            return None

    def update_chart_data(self, chart_id: str, data: pd.DataFrame) -> bool:
        """Update the data of an existing chart."""
        try:
            # Convert DataFrame to CSV string
            csv_data = data.to_csv(index=False)
            
            # Update headers for the request
            headers = self.headers.copy()
            headers["Content-Type"] = "text/csv"
            
            response = requests.put(
                f"{self.base_url}/charts/{chart_id}/data",
                headers=headers,
                data=csv_data
            )
            response.raise_for_status()
            
            self.logger.info(f"Successfully updated data for chart: {chart_id}")
            return True
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Failed to update chart data: {str(e)}")
            return False

    def publish_chart(self, chart_id: str) -> bool:
        """Publish a chart to make it visible."""
        try:
            response = requests.post(
                f"{self.base_url}/charts/{chart_id}/publish",
                headers=self.headers
            )
            response.raise_for_status()
            
            self.logger.info(f"Successfully published chart: {chart_id}")
            return True
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Failed to publish chart: {str(e)}")
            return False

# Example usage
if __name__ == "__main__":
    # Get API token from environment variable
    api_token = os.getenv("DATAWRAPPER_API_TOKEN")
    if not api_token:
        raise ValueError("Please set the DATAWRAPPER_API_TOKEN environment variable")

    # Initialize the automation class
    dw = DatawrapperAutomation(api_token)

    # Create sample data for a stacked bar chart
    # Format: Each column (except first) represents a stack segment
    data = pd.DataFrame({
        'Year': ['2020', '2021', '2022'],
        'Urban': [1000000, 1100000, 1200000],
        'Suburban': [500000, 550000, 600000],
        'Rural': [250000, 240000, 230000]
    })

    # Create a new chart
    chart_id = dw.create_chart(
        title="Population Distribution by Area Type",
        chart_type="d3-bars-stacked",
        metadata={
            "theme": "datawrapper",
            "language": "en-US",
            "metadata": {
                "describe": {
                    "column-format": {
                        "Urban": "numeric",
                        "Suburban": "numeric",
                        "Rural": "numeric"
                    }
                }
            }
        }
    )

    if chart_id:
        print(f"Created chart with ID: {chart_id}")
        
        # Update chart with data
        if dw.update_chart_data(chart_id, data):
            print("Updated chart data")
            # Publish the chart
            if dw.publish_chart(chart_id):
                print(f"Chart published! View it at: https://datawrapper.dwcdn.net/{chart_id}")