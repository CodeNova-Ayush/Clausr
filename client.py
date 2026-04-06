import urllib.request
import urllib.parse
import json
from models import ContractObservation, ContractAction, ContractState

class ContractFixClient:
    def __init__(self, base_url: str = "http://localhost:7860"):
        self.base_url = base_url.rstrip("/")
        
    def reset(self, task_id: str = "easy") -> ContractObservation:
        url = f"{self.base_url}/reset?task_id={urllib.parse.quote(task_id)}"
        req = urllib.request.Request(url, method="POST")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))
            return ContractObservation(**data)
            
    def step(self, action: ContractAction) -> ContractObservation:
        url = f"{self.base_url}/step"
        data_bytes = action.model_dump_json().encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes, method="POST")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))
            return ContractObservation(**data)
            
    def state(self) -> ContractState:
        url = f"{self.base_url}/state"
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))
            return ContractState(**data)
            
    def health(self) -> bool:
        url = f"{self.base_url}/health"
        req = urllib.request.Request(url, method="GET")
        try:
            with urllib.request.urlopen(req) as response:
                return response.status == 200
        except Exception:
            return False
