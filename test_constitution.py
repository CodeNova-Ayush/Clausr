from fastapi.testclient import TestClient
from server.app import app

def main():
    client = TestClient(app)
    
    print("Testing /constitution/health...")
    resp = client.get("/constitution/health")
    print(resp.json())
    
    print("\nTesting /constitution/reset...")
    resp = client.post("/constitution/reset?task_id=constitution_easy")
    obs = resp.json()
    print("Task ID:", obs["task_id"])
    print("Contracts loaded:", len(obs["contracts"]))
    print("Cross-contradictions:", obs["num_cross_contradictions"])
    
    print("\nTesting /constitution/step with empty findings...")
    resp = client.post("/constitution/step?task_id=constitution_easy", json={
        "cross_findings": [],
        "cascade_chains": []
    })
    print("Step response keys:", resp.json().keys())
    print("Score:", resp.json()["score"])

if __name__ == "__main__":
    main()
