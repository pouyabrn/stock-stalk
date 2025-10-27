import asyncio
import os
from fastapi.testclient import TestClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_chat_endpoint():
    """Test the /chat endpoint"""
    # Import after environment is loaded
    from main import app

    client = TestClient(app)

    # Test with MSFT query
    test_message = "how's msft doing?"
    response = client.post("/chat", json={"message": test_message})

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    if response.status_code == 200:
        print("SUCCESS: Server is working correctly!")
        return True
    else:
        print("ERROR: Server error occurred")
        print(f"Error: {response.text}")
        return False

if __name__ == "__main__":
    test_chat_endpoint()
